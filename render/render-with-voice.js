#!/usr/bin/env node
/* =========================================================================
 * render/render-with-voice.js
 * -------------------------------------------------------------------------
 * content.js에 이미 맞춰둔 타임라인대로 화면(index.html?clean=1)을
 * "실제 경과 시간 기준으로 정확하게" 캡처하고, 지정한 나레이션 오디오
 * 파일을 그대로 입혀 최종 MP4를 만듭니다.
 *
 * render.js의 recordWebm()(실시간 녹화)은 내부 인코딩 파이프라인 지연이
 * 누적되면서 영상 후반부로 갈수록 최대 1초 가까이 어긋날 수 있어서,
 * 오디오와 정밀하게 맞춰야 하는 이 스크립트는 대신
 * render.js의 recordFramesPolled()를 사용합니다. 이 방식은 Node가
 * Date.now()로 각 캡처 시점을 직접 재기 때문에 누적 오차가 없고,
 * content.js의 time 값과 실제 출력 영상이 항상 정확히 일치합니다.
 *
 * 이 스크립트는 오디오의 타이밍을 전혀 건드리지 않습니다.
 * (오디오 속도/내용은 원본 그대로, 화면 쪽 타임라인을 오디오에 맞추는 작업은
 *  content.js를 손으로 수정해서 이미 끝냈다는 전제입니다)
 *
 * 사용법:
 *   npm run render:voice
 *   node render/render-with-voice.js [나레이션 오디오 경로]
 *   (경로를 생략하면 voice/narration.m4a 를 사용합니다)
 *
 * 결과물: output/shorts.mp4
 * ======================================================================= */

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const {
  ROOT_DIR,
  OUTPUT_DIR,
  WIDTH,
  HEIGHT,
  FPS,
  readTotalDuration,
  checkFfmpeg,
  recordFramesPolled,
} = require("./render.js");

const OUTPUT_MP4 = path.join(OUTPUT_DIR, "shorts.mp4");
const DEFAULT_VOICE_PATH = path.join(ROOT_DIR, "voice", "narration.m4a");

function probeDuration(filePath) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]).toString();
  return parseFloat(out.trim());
}

// (가변 프레임 간격의) 캡처 목록(ffconcat) + 나레이션 오디오를 하나의
// mp4로 합칩니다. 인코딩 과정에서 30fps로 정규화됩니다.
function muxFramesAndAudio(listPath, audioPath, totalDuration) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(OUTPUT_MP4)) fs.rmSync(OUTPUT_MP4);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-i", audioPath,
      "-vf",
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}`,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      // content.js의 totalDuration(=오디오 타이밍 기준으로 정한 영상 길이)에
      // 정확히 맞춰 자릅니다. (오디오가 이보다 짧으면 남는 구간은 무음으로 유지됩니다)
      "-t", String(totalDuration),
      "-movflags", "+faststart",
      OUTPUT_MP4,
    ],
    { stdio: "inherit" }
  );
}

async function main() {
  checkFfmpeg();

  const voicePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_VOICE_PATH;

  if (!fs.existsSync(voicePath)) {
    throw new Error(
      `나레이션 오디오 파일을 찾을 수 없습니다: ${voicePath}\n` +
        `voice/narration.m4a 위치에 파일을 넣거나, 경로를 인자로 지정해주세요.\n` +
        `예) node render/render-with-voice.js path/to/audio.mp3`
    );
  }

  const totalDuration = readTotalDuration();
  console.log(`[render:voice] content.js totalDuration = ${totalDuration}s`);
  console.log(`[render:voice] 나레이션 오디오: ${path.relative(ROOT_DIR, voicePath)}`);

  const audioDuration = probeDuration(voicePath);
  if (Math.abs(audioDuration - totalDuration) > 2) {
    console.warn(
      `[render:voice] ⚠ 오디오 길이(${audioDuration.toFixed(
        2
      )}s)와 content.js의 totalDuration(${totalDuration}s)이 2초 넘게 차이납니다. ` +
        `타임라인을 이 오디오에 맞춰 다시 확인해보세요.`
    );
  }

  console.log(
    "[render:voice] 화면을 실제 시간으로 재생하며 캡처 중... (완료까지 실제 영상 길이보다 시간이 더 걸릴 수 있습니다)"
  );
  const { listPath, frameCount } = await recordFramesPolled(totalDuration);
  console.log(`[render:voice] 캡처 완료: 프레임 ${frameCount}장`);

  console.log("[render:voice] 영상 + 나레이션 합성 중...");
  muxFramesAndAudio(listPath, voicePath, totalDuration);

  console.log("[render:voice] 완료:", path.relative(ROOT_DIR, OUTPUT_MP4));
}

main().catch((err) => {
  console.error("[render:voice] 실패:", err.message);
  process.exit(1);
});
