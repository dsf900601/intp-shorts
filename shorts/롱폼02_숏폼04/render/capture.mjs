// 롱폼02_숏폼04 프레임 캡처 스크립트
// timeline.json 기준으로 0초 ~ 전체 길이까지 30fps로 window.__seek(t)를 호출해
// 결정론적으로(=CSS transition 타이밍에 흔들리지 않고) PNG 시퀀스를 뽑는다.
// 렌더링(최종 mp4 생성)은 하지 않는다 — render.sh가 이 스크립트 결과 + 오디오로 mux한다.
//
// 사용법: node render/capture.mjs
// 사전 조건: `npm install`로 playwright가 설치되어 있어야 함 (repo root package.json 참고)

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHORT_DIR = path.resolve(__dirname, ".."); // shorts/롱폼02_숏폼04
const REPO_ROOT = path.resolve(SHORT_DIR, "..", ".."); // 저장소 루트 (shared/ 포함)
const OUT_DIR = path.join(SHORT_DIR, "output", "frames");
const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
};

function startStaticServer(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split("?")[0]);
        const filePath = path.join(root, urlPath);
        if (!filePath.startsWith(root)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const data = await readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      } catch (e) {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const server = await startStaticServer(REPO_ROOT);
  const { port } = server.address();
  const relIndex = path.relative(REPO_ROOT, path.join(SHORT_DIR, "index.html")).split(path.sep).join("/");
  const url = `http://127.0.0.1:${port}/${relIndex}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  await page.addInitScript(() => { window.__CAPTURE__ = true; });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__totalDuration === "number");

  const total = await page.evaluate(() => window.__totalDuration);
  const frameCount = Math.ceil(total * FPS);
  console.log(`총 길이 ${total.toFixed(2)}s, ${FPS}fps -> ${frameCount} 프레임 캡처`);

  for (let i = 0; i < frameCount; i++) {
    const t = i / FPS;
    await page.evaluate((t) => window.__seek(t), t);
    const file = path.join(OUT_DIR, `frame_${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: file });
    if (i % 30 === 0) console.log(`  frame ${i}/${frameCount} (t=${t.toFixed(2)}s)`);
  }

  await browser.close();
  server.close();
  console.log(`완료: ${OUT_DIR}`);
  console.log(`다음 단계: render/render.sh 실행 (PNG 시퀀스 + audio -> mp4)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
