#!/usr/bin/env node
/* =========================================================================
 * render/render.js
 * -------------------------------------------------------------------------
 * index.html(?clean=1) 화면을 실제 재생 속도 그대로 녹화한 뒤,
 * 1080x1920 / 30fps MP4 파일로 변환합니다.
 *
 * 사용법:
 *   npm install
 *   npx playwright install chromium   (최초 1회, 브라우저 바이너리 설치)
 *   npm run render
 *
 * 결과물: output/shorts.mp4
 * ======================================================================= */

const path = require("path");
const fs = require("fs");
const os = require("os");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const OUTPUT_MP4 = path.join(OUTPUT_DIR, "shorts.mp4");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
// 마지막 장면(마지막 댓글)이 화면에 붙자마자 영상이 끝나 버리지 않도록
// content.js의 totalDuration 이후에 조금 더 여유를 두고 녹화를 끝냅니다.
const END_BUFFER_SECONDS = 1.5;

// content.js는 브라우저 전역(window)에 값을 붙이는 방식으로 작성돼 있으므로,
// 여기서도 가짜 window 객체를 만들어 그대로 로드해서 totalDuration만 읽어옵니다.
function readTotalDuration() {
  const src = fs.readFileSync(path.join(ROOT_DIR, "content.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "content.js" });
  const content = sandbox.window.SHORTS_CONTENT;
  if (!content || typeof content.totalDuration !== "number") {
    throw new Error("content.js에서 totalDuration 값을 읽지 못했습니다.");
  }
  return content.totalDuration;
}

function checkFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch (err) {
    throw new Error(
      "ffmpeg를 찾을 수 없습니다. 먼저 ffmpeg를 설치한 뒤 다시 실행해주세요. " +
        "(macOS: brew install ffmpeg / Ubuntu: sudo apt install ffmpeg)"
    );
  }
}

// 화면을 실제 시간 그대로 녹화합니다 (Playwright 내장 recordVideo 사용).
// -> 브라우저 애니메이션/타이밍은 손대지 않고 그대로 흘러가는 것을 그대로 캡처합니다.
async function recordWebm(totalDurationSeconds) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-render-"));

  const launchOptions = {};
  // 특수한 실행 환경(예: 컨테이너)에서 크로미움 실행 경로를 직접 지정해야 할 때 사용.
  // 일반적인 로컬 사용에서는 설정하지 않아도 됩니다.
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: tmpDir, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();

  const indexUrl = "file://" + path.join(ROOT_DIR, "index.html") + "?clean=1";
  await page.goto(indexUrl);

  const waitMs = Math.round((totalDurationSeconds + END_BUFFER_SECONDS) * 1000);
  await page.waitForTimeout(waitMs);

  const video = page.video();
  await context.close();
  await browser.close();

  return video.path();
}

// ffmpeg로 30fps / 1080x1920 / h264 mp4로 정규화합니다.
// (Playwright의 webm 녹화본은 프레임 수가 가변적일 수 있어 -r 옵션으로
//  실제 재생 시간을 유지한 채 30fps로 맞춰줍니다)
function convertToMp4(webmPath) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(OUTPUT_MP4)) fs.rmSync(OUTPUT_MP4);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i", webmPath,
      "-vf",
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      OUTPUT_MP4,
    ],
    { stdio: "inherit" }
  );
}

async function main() {
  checkFfmpeg();
  const totalDuration = readTotalDuration();
  console.log(
    `[render] content.js totalDuration = ${totalDuration}s (+${END_BUFFER_SECONDS}s 여유) 로 녹화를 시작합니다...`
  );

  const webmPath = await recordWebm(totalDuration);
  console.log("[render] 브라우저 녹화 완료:", webmPath);

  console.log("[render] MP4로 변환 중...");
  convertToMp4(webmPath);

  console.log("[render] 완료:", path.relative(ROOT_DIR, OUTPUT_MP4));
}

main().catch((err) => {
  console.error("[render] 실패:", err.message);
  process.exit(1);
});
