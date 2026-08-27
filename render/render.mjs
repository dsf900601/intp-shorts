#!/usr/bin/env node
/**
 * ============================================================================
 *  결정론적 프레임 렌더러 — 웹 미리보기(index.html)를 수정하지 않고
 *  외부(Playwright)에서 타임라인을 정확히 제어해 MP4로 렌더링한다.
 * ============================================================================
 *
 * 왜 "실시간 화면 녹화"가 아니라 "프레임 단위 렌더링"인가
 * --------------------------------------------------------------------------
 * src/app.js는 requestAnimationFrame(rAF)이 브라우저로부터 받는 실제 타임스탬프로
 * 재생 경과 시간(elapsed)을 계산한다. 이 스크립트는 페이지 로드 전에
 * window.requestAnimationFrame을 가로채서, 콜백을 즉시 실행하지 않고 큐에
 * 쌓아둔 뒤 우리가 원하는 "가짜 타임스탬프"로 정확히 하나씩 흘려보낸다.
 * 즉 30fps 기준 936프레임이라면 0/30초, 1/30초, 2/30초 ... 순서로 정확히
 * 소환하므로, 시스템이 느려서 실제 캡처에 시간이 오래 걸리더라도 화면에
 * "표시되는 내용"(누가 활성화됐는지, 자막이 무엇인지)은 시스템 성능과
 * 무관하게 항상 정확한 프레임에 고정된다 — 프레임 드롭이 원천적으로 없다.
 *
 * 다만 카드 테두리/투명도 등 CSS transition·keyframes 애니메이션은 실제
 * 벽시계 시간에 따라 진행되므로, 매 프레임 캡처 직전 "지금까지 실제로
 * 몇 ms가 지났어야 하는지"에 맞춰 살짝 대기(pace)한다 — 이렇게 하면 실제
 * 브라우저 미리보기와 프레임 단위로 최대한 비슷하게 나오면서도, 시스템이
 * 느려서 대기 시간을 못 맞추는 경우에는 그냥 넘어가고(프레임을 스킵하지
 * 않음) 계속 진행한다. 즉 콘텐츠 타임라인은 100% 정확하고, 미세한
 * transition 타이밍만 시스템 속도에 따라 아주 약간 달라질 수 있다.
 *
 * 이 파일과 render/package.json 외에는 어떤 소스 파일도 수정하지 않는다
 * (index.html, src/data.js, src/app.js, src/style.css 전부 그대로).
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ── CLI 옵션 ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
const FPS = Number(getArg("fps", "30"));
const OUT_PATH = path.resolve(REPO_ROOT, getArg("out", "render/out/reading-club-ep2.mp4"));
const CRF = getArg("crf", "18");

const WIDTH = 1080;
const HEIGHT = 1920;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeAsync(stream, chunk) {
  return new Promise((resolve, reject) => {
    const flushed = stream.write(chunk, (err) => {
      if (err) reject(err);
    });
    if (flushed) resolve();
    else stream.once("drain", resolve);
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  console.log("▶ Chromium 실행 중...");
  const browser = await chromium.launch();
  // 뷰포트를 1080x1920보다 넉넉히 크게 잡아, src/app.js의 fitStage()가
  // 계산하는 스케일이 항상 1(=원본 크기, 확대/축소 없음)로 고정되게 한다.
  const page = await browser.newPage({ viewport: { width: 1600, height: 2400 } });

  // ── requestAnimationFrame 가로채기 (index.html/src/*는 그대로, 페이지에
  // 주입만 한다) ───────────────────────────────────────────────────────
  await page.addInitScript(() => {
    window.__frameQueue = [];
    window.__rafNative = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__frameQueue.push(cb);
      return window.__frameQueue.length;
    };
    window.__pumpFrame = (ts) => {
      const queue = window.__frameQueue;
      window.__frameQueue = [];
      queue.forEach((cb) => cb(ts));
    };
  });

  const url = pathToFileURL(path.join(REPO_ROOT, "index.html")).href;
  console.log("▶ 페이지 로드:", url);
  await page.goto(url, { waitUntil: "load" });

  // ── 이미지 디코드 + 폰트 로드 완료까지 대기 ──────────────────────────
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => img.decode().catch(() => {}))
    );
  });

  // ── 스케일이 정확히 1인지(=잘림/축소 없이 1080x1920 원본 그대로) 확인 ──
  const stageBox = await page.locator("#stage").boundingBox();
  if (!stageBox || Math.abs(stageBox.width - WIDTH) > 0.5 || Math.abs(stageBox.height - HEIGHT) > 0.5) {
    await browser.close();
    throw new Error(
      `#stage 크기가 ${WIDTH}x${HEIGHT}가 아닙니다 (실제: ${stageBox?.width}x${stageBox?.height}). ` +
        `뷰포트를 더 키우거나 fitStage() 스케일 로직을 확인하세요.`
    );
  }

  // ── 총 러닝타임을 앱이 실제로 계산한 값에서 그대로 읽어온다 (하드코딩 금지) ──
  // 첫 프레임(t=0)을 한 번 흘려보내면 #timeReadout에 "0.0s / 31.2s" 형태로
  // src/app.js가 계산한 totalDuration이 그대로 찍힌다. 이 스크립트는 그
  // 텍스트를 읽기만 할 뿐, dialogue/duration 공식을 별도로 복제하지 않는다
  // — 그래야 나중에 src/data.js의 대사만 바꿔도 render 스크립트 수정 없이
  // 항상 정확한 총 프레임 수로 다시 렌더링된다.
  const BASE_TS = 1_000_000;
  await page.evaluate((ts) => window.__pumpFrame(ts), BASE_TS);
  await page.evaluate(() => new Promise((r) => window.__rafNative(r)));
  const readout = await page.locator("#timeReadout").textContent();
  const match = readout && readout.match(/\/\s*([\d.]+)s/);
  if (!match) {
    await browser.close();
    throw new Error(`#timeReadout에서 총 러닝타임을 읽지 못했습니다: "${readout}"`);
  }
  const totalDuration = parseFloat(match[1]);
  const totalFrames = Math.round(totalDuration * FPS);
  console.log(`▶ 총 러닝타임: ${totalDuration}s → ${FPS}fps 기준 ${totalFrames}프레임`);

  // ── ffmpeg 프로세스 시작 (image2pipe → H.264 MP4, 무음 오디오 트랙 포함) ──
  const ffmpegArgs = [
    "-y",
    "-f", "image2pipe", "-vcodec", "png", "-framerate", String(FPS), "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-crf", String(CRF), "-preset", "medium",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest",
    "-movflags", "+faststart",
    "-r", String(FPS),
    OUT_PATH,
  ];
  console.log("▶ ffmpeg", ffmpegArgs.join(" "));
  const ffmpeg = spawn("ffmpeg", ffmpegArgs, { stdio: ["pipe", "inherit", "inherit"] });
  const ffmpegDone = new Promise((resolve, reject) => {
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });

  // ── 프레임 0 .. totalFrames-1 을 정확히 한 프레임씩 렌더링 ───────────
  const stage = page.locator("#stage");
  const wallStart = Date.now();
  let lastLog = -1;

  for (let i = 0; i < totalFrames; i++) {
    const targetTs = BASE_TS + (i / FPS) * 1000;
    await page.evaluate((ts) => window.__pumpFrame(ts), targetTs);
    // 실제 화면에 반영(paint)될 때까지 진짜 rAF로 한 틱 대기
    await page.evaluate(() => new Promise((r) => window.__rafNative(r)));

    // CSS transition/keyframes가 실제 미리보기와 비슷하게 진행되도록,
    // "지금쯤 실제로 몇 ms가 지났어야 하는지"에 맞춰 대기(뒤처졌으면 스킵)
    const targetWall = wallStart + (i * 1000) / FPS;
    const behind = Date.now() - targetWall;
    if (behind < 0) await sleep(-behind);

    const png = await stage.screenshot({ type: "png", animations: "allow" });
    await writeAsync(ffmpeg.stdin, png);

    const sec = Math.floor(i / FPS);
    if (sec !== lastLog && sec % 5 === 0) {
      lastLog = sec;
      process.stdout.write(`  캡처 중... ${sec}s / ${totalDuration}s\r`);
    }
  }
  process.stdout.write("\n");

  ffmpeg.stdin.end();
  await ffmpegDone;
  await browser.close();

  console.log(`▶ 렌더링 완료: ${OUT_PATH}`);
  return { outPath: OUT_PATH, totalFrames, totalDuration, fps: FPS };
}

main().catch((err) => {
  console.error("✖ 렌더링 실패:", err);
  process.exit(1);
});
