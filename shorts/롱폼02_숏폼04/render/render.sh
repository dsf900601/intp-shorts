#!/usr/bin/env bash
# 롱폼02_숏폼04 최종 렌더링
# - 이 스크립트는 "코드"로만 준비된 것이며, 이번 작업에서 실행/렌더링하지 않았습니다.
# - 실제 롱폼02 음성(또는 이 대본을 새로 녹음/TTS한 음성)을 audio/ 폴더에 넣은 뒤 실행하세요.
#
# 사용법:
#   cd shorts/롱폼02_숏폼04
#   ./render/render.sh
#
# 사전 조건:
#   1) repo 루트에서 `npm install` (playwright 설치)
#   2) audio/롱폼02_숏폼04.mp3 (또는 .wav) 준비
#   3) (선택) node scripts/fit-timeline-to-audio.mjs 로 timeline.json 타이밍을
#      실제 오디오 길이에 맞춰 보정

set -euo pipefail
cd "$(dirname "$0")/.."   # shorts/롱폼02_숏폼04 로 이동

AUDIO_MP3="audio/롱폼02_숏폼04.mp3"
AUDIO_WAV="audio/롱폼02_숏폼04.wav"
OUT_MP4="output/롱폼02_숏폼04.mp4"
FRAMES_DIR="output/frames"

if [ -f "$AUDIO_MP3" ]; then
  AUDIO="$AUDIO_MP3"
elif [ -f "$AUDIO_WAV" ]; then
  AUDIO="$AUDIO_WAV"
else
  echo "오디오 파일이 없습니다: $AUDIO_MP3 (또는 .wav)"
  echo "롱폼02 원본 음성(또는 이 대본을 녹음/TTS한 음성)을 audio/ 폴더에 넣어주세요."
  exit 1
fi

echo "[1/2] 프레임 캡처 (Playwright)"
node render/capture.mjs

echo "[2/2] mp4 muxing (ffmpeg)"
mkdir -p output
ffmpeg -y \
  -framerate 30 -i "$FRAMES_DIR/frame_%05d.png" \
  -i "$AUDIO" \
  -c:v libx264 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -shortest \
  "$OUT_MP4"

echo "완료: $OUT_MP4"
