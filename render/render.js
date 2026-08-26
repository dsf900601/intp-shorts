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
// 여기서도 가짜 window 객체를 만들어 그대로 로드해서 SHORTS_CONTENT를 읽어옵니다.
function readContent() {
  const src = fs.readFileSync(path.join(ROOT_DIR, "content.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "content.js" });
  const content = sandbox.window.SHORTS_CONTENT;
  if (!content) {
    throw new Error("content.js에서 SHORTS_CONTENT를 읽지 못했습니다.");
  }
  return content;
}

function readTotalDuration() {
  const content = readContent();
  if (typeof content.totalDuration !== "number") {
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
//
// 브라우저 실행/페이지 로딩에는 항상 약간의 시간이 걸리기 때문에, 녹화 파일의
// 0초 지점은 content.js의 0초(=script.js의 타임라인이 실제로 시작되는 시점)보다
// 조금 더 이릅니다. 이 함수는 그 차이(leadInSeconds)를 직접 측정해서 같이
// 반환하므로, 호출하는 쪽에서 영상을 그만큼 앞부분만 잘라내면 content.js의
// time 값과 실제 영상 프레임이 정확히 일치하게 됩니다.
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
  const navStartedAt = Date.now();
  await page.goto(indexUrl);
  // script.js가 실제로 타임라인 스케줄링을 시작하는 순간까지 기다립니다.
  await page.waitForFunction(() => window.__SHORTS_TIMELINE_STARTED__ === true);
  const leadInSeconds = (Date.now() - navStartedAt) / 1000;

  const waitMs = Math.round((totalDurationSeconds + END_BUFFER_SECONDS) * 1000);
  await page.waitForTimeout(waitMs);

  const video = page.video();
  await context.close();
  await browser.close();

  return { path: await video.path(), leadInSeconds };
}

// 화면을 실제 시간 그대로 재생시키면서, Node에서 가능한 한 빠르게(보통
// 15~20fps 정도) 스크린샷을 연달아 찍고 각 장면에 "실제 경과 시간"을
// 정확히 표시해 둡니다. recordVideo()는 내부 인코딩 파이프라인의 지연이
// 누적되면서 뒤로 갈수록 최대 1초 가까이 어긋날 수 있는데, 이 방식은
// Node가 직접 Date.now()로 시간을 재기 때문에 그런 누적 오차가 없습니다.
// (촬영 속도가 30fps보다 느려도 문제 없습니다 - 뒤 단계에서 각 장면을
// "다음 장면이 나오기 전까지" 유지시키는 방식으로 30fps 영상을 만들기
// 때문에, 타이밍 자체는 항상 정확합니다)
async function recordFramesPolled(totalDurationSeconds) {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-frames-"));

  const launchOptions = {};
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
  });
  const page = await context.newPage();

  const indexUrl = "file://" + path.join(ROOT_DIR, "index.html") + "?clean=1";
  await page.goto(indexUrl, { waitUntil: "load" });
  // script.js가 실제로 타임라인 스케줄링을 시작하는 순간을 "0초"로 삼습니다.
  await page.waitForFunction(() => window.__SHORTS_TIMELINE_STARTED__ === true);
  const timelineStartMs = Date.now();

  const endMs =
    timelineStartMs + Math.round((totalDurationSeconds + END_BUFFER_SECONDS) * 1000);

  const captures = []; // { file, t } - t = 타임라인 시작 이후 경과 시간(초)
  let i = 0;
  while (Date.now() < endMs) {
    const buf = await page.screenshot({ type: "jpeg", quality: 85 });
    // 스크린샷이 "완료된" 시점을 기준으로 시간을 기록합니다.
    // (촬영 도중 화면이 바뀌었을 수 있으므로, 이 프레임은 최소한 이
    //  시점까지는 유효했다고 보는 것이 안전합니다)
    const t = (Date.now() - timelineStartMs) / 1000;
    const file = path.join(framesDir, `raw_${String(i).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, buf);
    captures.push({ file, t });
    i++;
  }

  await context.close();
  await browser.close();

  if (captures.length === 0) {
    throw new Error("화면 캡처에 실패했습니다 (프레임이 0개).");
  }

  // ffmpeg concat demuxer용 목록을 만듭니다. 각 프레임을 "다음 프레임이
  // 찍히기 전까지" 화면에 유지시켜서, 실제 경과 시간을 그대로 재현합니다.
  const listPath = path.join(framesDir, "list.ffconcat");
  const lines = ["ffconcat version 1.0"];
  const totalWithBuffer = totalDurationSeconds + END_BUFFER_SECONDS;
  for (let k = 0; k < captures.length; k++) {
    const nextT = k + 1 < captures.length ? captures[k + 1].t : totalWithBuffer;
    const duration = Math.max(0.001, nextT - captures[k].t);
    lines.push(`file '${captures[k].file}'`);
    lines.push(`duration ${duration.toFixed(4)}`);
  }
  // concat demuxer 특성상 마지막 파일은 duration이 적용되도록 한 번 더 적어줍니다.
  lines.push(`file '${captures[captures.length - 1].file}'`);
  fs.writeFileSync(listPath, lines.join("\n"));

  return { listPath, framesDir, frameCount: captures.length };
}

// ffmpeg로 30fps / 1080x1920 / h264 mp4로 정규화합니다.
// (Playwright의 webm 녹화본은 프레임 수가 가변적일 수 있어 -r 옵션으로
//  실제 재생 시간을 유지한 채 30fps로 맞춰줍니다)
// leadInSeconds만큼 앞부분을 잘라내서, 출력 영상의 0초 = content.js의 0초가
// 되도록 맞춥니다.
function convertToMp4(webmPath, leadInSeconds) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(OUTPUT_MP4)) fs.rmSync(OUTPUT_MP4);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss", String(leadInSeconds || 0),
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

  const { path: webmPath, leadInSeconds } = await recordWebm(totalDuration);
  console.log(
    `[render] 브라우저 녹화 완료 (시작 지연 ${leadInSeconds.toFixed(2)}s 보정 예정):`,
    webmPath
  );

  console.log("[render] MP4로 변환 중...");
  convertToMp4(webmPath, leadInSeconds);

  console.log("[render] 완료:", path.relative(ROOT_DIR, OUTPUT_MP4));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[render] 실패:", err.message);
    process.exit(1);
  });
}

// render/render-with-voice.js가 화면 녹화 로직을 그대로 재사용할 수 있도록
// 내보냅니다. (이 파일 자체의 동작은 바뀌지 않습니다)
module.exports = {
  ROOT_DIR,
  OUTPUT_DIR,
  WIDTH,
  HEIGHT,
  FPS,
  END_BUFFER_SECONDS,
  readContent,
  readTotalDuration,
  checkFfmpeg,
  recordWebm,
  recordFramesPolled,
};
