/**
 * npm run capture
 *
 * content.json의 타이밍대로 index.html을 렌더링하면서 1080x1920 프레임을
 * PNG 시퀀스로 저장한다. Playwright로 페이지의 window.renderAtTime(t)를
 * 프레임마다 직접 호출하기 때문에, 실제 애니메이션 속도와 무관하게
 * 정확한 프레임이 매번 생성된다 (타이밍이 흔들리지 않는다).
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { createStaticServer } = require("./static-server");
const { findChromiumExecutable } = require("./find-chromium");

const ROOT = path.resolve(__dirname, "..");
const FRAMES_DIR = path.join(ROOT, "output", "frames");
const PORT = process.env.CAPTURE_PORT ? Number(process.env.CAPTURE_PORT) : 4174;

async function run({ quiet = false } = {}) {
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  const content = JSON.parse(fs.readFileSync(path.join(ROOT, "content.json"), "utf-8"));
  const fps = content.meta.fps || 30;
  const durationMs = content.meta.durationMs;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, resolve));
  log(`캡처용 로컬 서버 시작: http://localhost:${PORT}`);

  const executablePath = findChromiumExecutable();
  if (executablePath) log(`Chromium 실행 파일 사용: ${executablePath}`);

  const browser = await chromium.launch({
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
    });

    await page.goto(`http://localhost:${PORT}/index.html?capture=1`, {
      waitUntil: "load",
    });
    await page.waitForFunction(() => window.__ready === true);

    log(`총 ${totalFrames} 프레임 캡처 시작 (fps=${fps}, duration=${durationMs}ms)`);

    for (let i = 0; i < totalFrames; i++) {
      const t = (i * 1000) / fps;
      await page.evaluate((time) => window.renderAtTime(time), t);
      const fileName = `frame_${String(i + 1).padStart(5, "0")}.png`;
      await page.screenshot({ path: path.join(FRAMES_DIR, fileName) });

      if (!quiet && (i % 30 === 0 || i === totalFrames - 1)) {
        log(`  frame ${i + 1}/${totalFrames}`);
      }
    }

    log(`프레임 캡처 완료: ${FRAMES_DIR}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  return { fps, totalFrames, framesDir: FRAMES_DIR, content };
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
