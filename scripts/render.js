/**
 * npm run render  (= npm run video)
 *
 * 1) capture.js로 content.json 타이밍대로 PNG 프레임 시퀀스를 만들고
 * 2) 시스템에 ffmpeg가 설치되어 있으면 프레임 + (선택) 오디오를 합쳐
 *    output/video.mp4 로 인코딩한다.
 *
 * ffmpeg가 없으면 프레임만 생성한 뒤, 설치 안내 메시지를 출력하고 끝낸다.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { run: captureFrames } = require("./capture");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const FRAMES_GLOB = path.join(OUTPUT_DIR, "frames", "frame_%05d.png");
const VIDEO_OUT = path.join(OUTPUT_DIR, "video.mp4");

function hasFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

async function main() {
  const { fps, content } = await captureFrames();

  if (!hasFfmpeg()) {
    console.log("\n⚠️  시스템에서 ffmpeg를 찾을 수 없습니다.");
    console.log("   PNG 프레임은 output/frames 에 생성되어 있습니다.");
    console.log("   ffmpeg를 설치한 뒤 다시 'npm run render'를 실행하면 MP4까지 자동으로 만들어집니다.");
    console.log("   설치 예시: sudo apt-get install ffmpeg  /  brew install ffmpeg");
    return;
  }

  const narrationSrc = content.audio && content.audio.narrationSrc;
  const audioPath = narrationSrc ? path.resolve(ROOT, narrationSrc) : null;
  const hasAudio = audioPath && fs.existsSync(audioPath);

  const args = ["-y", "-framerate", String(fps), "-i", FRAMES_GLOB];

  if (hasAudio) {
    args.push("-i", audioPath);
  }

  args.push(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
    "-movflags", "+faststart"
  );

  if (hasAudio) {
    args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  args.push(VIDEO_OUT);

  console.log(`\nffmpeg로 MP4 인코딩 중${hasAudio ? " (오디오 포함)" : " (오디오 없음)"}...`);
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });

  if (result.status !== 0) {
    console.error("\n❌ ffmpeg 인코딩이 실패했습니다. 위 로그를 확인하세요.");
    process.exit(1);
  }

  console.log(`\n✅ 완료: ${VIDEO_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
