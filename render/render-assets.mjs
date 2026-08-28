#!/usr/bin/env node
/**
 * ============================================================================
 *  참가자별 "상태(state) 소스 영상" 렌더러 — CapCut 등에서 조립해 쓰는
 *  10초짜리 독립 MP4 클립(참가자 1명만 활성화)을 생성한다.
 * ============================================================================
 *
 * index.html, src/data.js, src/app.js, src/style.css는 전혀 수정하지 않는다.
 * 대신:
 *   1. src/data.js에서 participants 배열을 "있는 그대로" 읽어와 재사용한다
 *      (캐릭터/이름표/이미지/색상/역할 — 전부 원본 그대로, 새로 만들지 않음).
 *   2. 대상 인물 한 명이 클립 내내(사실은 -0.5초 전부터) 활성화 상태를
 *      유지하는 "1줄짜리" 가상 dialogue만 새로 구성한다.
 *   3. index.html을 그대로 복사한 임시 페이지를 만들되, data.js 대신 이
 *      가상 데이터를 불러오게 하고, 중앙 자막 영역만 강제로 투명 처리한다
 *      (박스 자체의 CSS/레이아웃은 손대지 않고, 인라인 style로 숨기기만 함).
 *   4. render.mjs와 같은 원리(requestAnimationFrame 가로채기)로 프레임을
 *      정확히 제어해 캡처하고 ffmpeg로 무음 H.264 MP4를 만든다.
 *
 * 사용법:
 *   npm run render:assets            # presets.mjs에 정의된 모든 상태
 *   npm run render:assets -- --only umji-reaction,minsu-active
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import vm from "node:vm";
import { PRESETS } from "./presets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const FPS = 30;
const CLIP_SECONDS = 10;
const WARMUP_SECONDS = 0.5; // 캡처 시작 전 미리 활성화시켜 테두리/이미지 전환을 끝내둔다
const TOTAL_FRAMES = Math.round(CLIP_SECONDS * FPS); // 300
const WIDTH = 1080;
const HEIGHT = 1920;

const TMP_HTML = path.join(REPO_ROOT, ".render-asset.html");
const TMP_DATA = path.join(REPO_ROOT, ".render-asset-data.js");
const OUT_DIR = path.join(REPO_ROOT, "output");

// ── CLI 옵션 ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;

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

// ── src/data.js에서 participants 배열만 "있는 그대로" 읽어온다 ──────────
// (파일을 수정하지 않고, 메모리에서 안전한 샌드박스로 평가만 한다)
function loadBaseTemplate() {
  const code = fs.readFileSync(path.join(REPO_ROOT, "src/data.js"), "utf8");
  const patched = code.replace(/\bconst\s+TEMPLATE\s*=/, "globalThis.TEMPLATE =");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(patched, sandbox, { filename: "src/data.js (읽기 전용 평가)" });
  if (!sandbox.TEMPLATE || !Array.isArray(sandbox.TEMPLATE.participants)) {
    throw new Error("src/data.js에서 TEMPLATE.participants를 읽지 못했습니다.");
  }
  return sandbox.TEMPLATE;
}

// ── 임시 렌더링용 HTML 1회 생성: index.html 그대로 + data 스크립트 경로만
// 교체 + 중앙 자막 영역을 인라인 style로 항상 투명 처리 ─────────────────
function buildTempHtml() {
  let html = fs.readFileSync(path.join(REPO_ROOT, "index.html"), "utf8");

  if (!html.includes('<script src="src/data.js"></script>')) {
    throw new Error("index.html에서 data.js 스크립트 태그를 찾지 못했습니다.");
  }
  html = html.replace(
    '<script src="src/data.js"></script>',
    `<script src="${path.basename(TMP_DATA)}"></script>`
  );

  const subtitleTag = '<div class="subtitle-area" id="subtitleArea">';
  if (!html.includes(subtitleTag)) {
    throw new Error("index.html에서 #subtitleArea를 찾지 못했습니다.");
  }
  // src/style.css는 건드리지 않는다. 이 임시 사본에만 인라인으로 숨김 처리.
  html = html.replace(
    subtitleTag,
    '<div class="subtitle-area" id="subtitleArea" style="opacity:0 !important; pointer-events:none;">'
  );

  fs.writeFileSync(TMP_HTML, html);
}

// ── 프리셋 1개당 가상 데이터 파일 작성 ───────────────────────────────────
function writePresetData(baseTemplate, preset) {
  const dialogueEntry = {
    speakerId: preset.speakerId,
    text: "",
    start: -WARMUP_SECONDS,
    duration: CLIP_SECONDS + WARMUP_SECONDS,
  };
  if (preset.reaction) dialogueEntry.type = "reaction";

  const presetTemplate = {
    meetingTitle: baseTemplate.meetingTitle,
    startClock: baseTemplate.startClock,
    participants: baseTemplate.participants, // 원본 그대로 재사용
    dialogue: [dialogueEntry],
    endingText: "",
    endingDelay: 0,
    endingHold: 0,
  };

  const code = `// render-assets.mjs가 자동 생성한 임시 파일 — 직접 수정하지 마세요.\nconst TEMPLATE = ${JSON.stringify(
    presetTemplate,
    null,
    2
  )};\n`;
  fs.writeFileSync(TMP_DATA, code);
}

async function installFrameControl(page) {
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
}

async function waitAssetsReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
  });
}

async function assertStageSize(page) {
  const box = await page.locator("#stage").boundingBox();
  if (!box || Math.abs(box.width - WIDTH) > 0.5 || Math.abs(box.height - HEIGHT) > 0.5) {
    throw new Error(`#stage 크기가 ${WIDTH}x${HEIGHT}가 아닙니다 (실제: ${box?.width}x${box?.height}).`);
  }
}

function spawnFfmpegVideoOnly(outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const args = [
    "-y",
    "-f", "image2pipe", "-vcodec", "png", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-crf", "18", "-preset", "medium",
    "-an", // 오디오 스트림 없음 (요청 사양)
    "-movflags", "+faststart",
    "-r", String(FPS),
    outPath,
  ];
  const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => {
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });
  return { ffmpeg, done, args };
}

async function renderOnePreset(page, preset, baseTemplate) {
  const outPath = path.join(OUT_DIR, `${preset.name}.mp4`);
  console.log(`\n▶ [${preset.name}] 렌더링 시작 → ${path.relative(REPO_ROOT, outPath)}`);

  writePresetData(baseTemplate, preset);
  const url = pathToFileURL(TMP_HTML).href;
  await page.goto(url, { waitUntil: "load" });
  await waitAssetsReady(page);
  await assertStageSize(page);

  const { ffmpeg, done } = spawnFfmpegVideoOnly(outPath);
  const stage = page.locator("#stage");
  const BASE_TS = 1_000_000;
  const warmupFrames = Math.round(WARMUP_SECONDS * FPS);

  // 워밍업: 캡처 시작(t=0) 이전 상태를 미리 흘려보내 활성화 테두리/이미지
  // 전환이 실제로 "끝난" 채로 첫 캡처 프레임을 맞이하게 한다 (루프 이음매용).
  // 이 프레임들은 화면에 반영만 시키고 저장하지 않는다.
  const wallStart = Date.now();
  for (let w = -warmupFrames; w < 0; w++) {
    const t = w / FPS; // 음수 (예: -0.5 ~ -1/30)
    await page.evaluate((ts) => window.__pumpFrame(ts), BASE_TS + t * 1000);
    await page.evaluate(() => new Promise((r) => window.__rafNative(r)));
    const targetWall = wallStart + (w + warmupFrames) * (1000 / FPS);
    const behind = Date.now() - targetWall;
    if (behind < 0) await sleep(-behind);
  }

  // 본 캡처: t = 0/30, 1/30, ... (TOTAL_FRAMES-1)/30 초, 정확히 300프레임 = 10.0초
  const captureWallStart = Date.now();
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / FPS;
    await page.evaluate((ts) => window.__pumpFrame(ts), BASE_TS + t * 1000);
    await page.evaluate(() => new Promise((r) => window.__rafNative(r)));

    const targetWall = captureWallStart + i * (1000 / FPS);
    const behind = Date.now() - targetWall;
    if (behind < 0) await sleep(-behind);

    const png = await stage.screenshot({ type: "png", animations: "allow" });
    await writeAsync(ffmpeg.stdin, png);

    if (i % 60 === 0) process.stdout.write(`  캡처 중... ${(i / FPS).toFixed(1)}s / ${CLIP_SECONDS}s\r`);
  }
  process.stdout.write("\n");

  ffmpeg.stdin.end();
  await done;
  console.log(`✔ [${preset.name}] 완료: ${outPath}`);
  return outPath;
}

async function main() {
  const baseTemplate = loadBaseTemplate();
  const participantById = Object.fromEntries(baseTemplate.participants.map((p) => [p.id, p]));

  buildTempHtml();

  const toRun = PRESETS.filter((p) => !only || only.has(p.name));
  const results = [];
  const skipped = [];

  console.log("▶ Chromium 실행 중...");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 2400 } });
  await installFrameControl(page);

  try {
    for (const preset of toRun) {
      const p = participantById[preset.speakerId];
      if (!p) {
        skipped.push({ name: preset.name, reason: `참가자 id "${preset.speakerId}"를 찾을 수 없음` });
        continue;
      }
      if (preset.reaction) {
        const hasField = !!p.reactionAvatarSrc;
        const fileOk =
          hasField && fs.existsSync(path.join(REPO_ROOT, p.reactionAvatarSrc.replace(/^\.\//, "")));
        if (!hasField || !fileOk) {
          skipped.push({
            name: preset.name,
            reason: !hasField
              ? `"${p.name}"에 reactionAvatarSrc가 지정되어 있지 않음 (놀란 표정 asset 없음)`
              : `reactionAvatarSrc 파일이 존재하지 않음: ${p.reactionAvatarSrc}`,
          });
          continue;
        }
      }
      const outPath = await renderOnePreset(page, preset, baseTemplate);
      results.push({ name: preset.name, outPath });
    }
  } finally {
    await browser.close();
    // 임시 파일 정리 (원본 코드는 처음부터 건드리지 않았으므로 삭제만 하면 됨)
    for (const f of [TMP_HTML, TMP_DATA]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  console.log("\n============================================================");
  console.log(`완료: ${results.length}개 렌더링, ${skipped.length}개 건너뜀`);
  for (const r of results) console.log(`  ✔ ${r.name} → ${path.relative(REPO_ROOT, r.outPath)}`);
  for (const s of skipped) console.log(`  ✖ ${s.name} (건너뜀: ${s.reason})`);
  console.log("============================================================");

  if (results.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("✖ 렌더링 실패:", err);
  process.exitCode = 1;
});
