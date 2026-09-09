// audio/ 폴더에 실제 내레이션을 넣은 뒤 실행하면
// timeline.json의 narration 계열 cue duration을 오디오 실제 길이에 맞춰
// 비율대로 재배분합니다. (댓글 3개의 duration은 건드리지 않음)
//
// 사용법: node scripts/fit-timeline-to-audio.mjs [audio파일 경로]
// 기본 경로: audio/롱폼02_숏폼04.mp3 (없으면 .wav 시도)

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHORT_DIR = path.resolve(__dirname, "..");
const TIMELINE_PATH = path.join(SHORT_DIR, "timeline.json");

async function getAudioDuration(audioPath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  return parseFloat(stdout.trim());
}

async function main() {
  const argPath = process.argv[2];
  const candidates = argPath
    ? [argPath]
    : [
        path.join(SHORT_DIR, "audio", "롱폼02_숏폼04.mp3"),
        path.join(SHORT_DIR, "audio", "롱폼02_숏폼04.wav"),
      ];
  const audioPath = candidates.find((p) => existsSync(p));
  if (!audioPath) {
    console.error("오디오 파일을 찾을 수 없습니다. audio/롱폼02_숏폼04.mp3(.wav)를 준비하거나 경로를 인자로 넘기세요.");
    process.exit(1);
  }

  const audioDuration = await getAudioDuration(audioPath);
  const timeline = JSON.parse(await readFile(TIMELINE_PATH, "utf-8"));

  const commentCues = timeline.cues.filter((c) => c.type === "comment");
  const narrationCues = timeline.cues.filter((c) => c.type !== "comment");

  const commentsTotal = commentCues.reduce((s, c) => s + c.duration, 0);
  const narrationTotalNow = narrationCues.reduce((s, c) => s + c.duration, 0);
  const narrationTargetTotal = Math.max(1, audioDuration - commentsTotal);
  const scale = narrationTargetTotal / narrationTotalNow;

  for (const cue of timeline.cues) {
    if (cue.type !== "comment") {
      cue.duration = Math.round(cue.duration * scale * 1000) / 1000;
    }
  }

  await writeFile(TIMELINE_PATH, JSON.stringify(timeline, null, 2) + "\n", "utf-8");

  const newTotal = timeline.cues.reduce((s, c) => s + c.duration, 0);
  console.log(`오디오 길이: ${audioDuration.toFixed(2)}s`);
  console.log(`내레이션 cue 배율: x${scale.toFixed(3)}`);
  console.log(`새 timeline 총 길이(댓글 포함): ${newTotal.toFixed(2)}s`);
  if (newTotal < 28 || newTotal > 37) {
    console.warn("주의: 목표(30~35초) 범위에서 다소 벗어났습니다. 필요하면 댓글 표시 시간을 수동으로 조정하세요.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
