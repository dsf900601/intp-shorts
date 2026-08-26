/**
 * Playwright의 기본 브라우저 탐색 로직이 실패하는 샌드박스/사내망 환경을 위한
 * 보조 탐색 함수. PLAYWRIGHT_BROWSERS_PATH 아래에 이미 설치되어 있는
 * chromium 실행 파일을 직접 찾아 executablePath로 사용한다.
 *
 * 일반적인 개발 환경에서는 (npx playwright install chromium 을 미리 실행했다면)
 * 이 함수가 아무것도 찾지 못해도 상관없다 — 그 경우 executablePath를 지정하지
 * 않고 Playwright의 기본 동작에 맡긴다.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function findChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }

  const browsersRoot =
    process.env.PLAYWRIGHT_BROWSERS_PATH &&
    process.env.PLAYWRIGHT_BROWSERS_PATH !== "0"
      ? process.env.PLAYWRIGHT_BROWSERS_PATH
      : defaultBrowsersPath();

  if (!browsersRoot || !fs.existsSync(browsersRoot)) return null;

  const candidates = [];
  for (const dirName of fs.readdirSync(browsersRoot)) {
    if (!dirName.startsWith("chromium-")) continue; // headless-shell 전용 폴더는 제외
    const dir = path.join(browsersRoot, dirName);
    candidates.push(
      path.join(dir, "chrome-linux", "chrome"),
      path.join(dir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
      path.join(dir, "chrome-win", "chrome.exe")
    );
  }

  return candidates.find((p) => fs.existsSync(p)) || null;
}

function defaultBrowsersPath() {
  const platform = os.platform();
  if (platform === "linux") return path.join(os.homedir(), ".cache", "ms-playwright");
  if (platform === "darwin")
    return path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (platform === "win32")
    return path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  return null;
}

module.exports = { findChromiumExecutable };
