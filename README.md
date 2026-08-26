# intp-shorts — 커뮤니티 숏츠 생성기

유튜브 쇼츠(9:16, 1080x1920)용 "익명 커뮤니티 게시글" 형식 영상을 대량으로
찍어내기 위한 재사용 가능한 템플릿이다. **`content.json`만 바꾸면 새 영상을
만들 수 있다.** 디자인/모션은 손대지 않는 것이 원칙이다 — 자세한 제작 규칙은
[`CLAUDE.md`](./CLAUDE.md) 참고.

## 폴더 구조

```
index.html          영상 화면 마크업 (구조만, 텍스트는 없음)
styles.css           디자인/레이아웃 (모든 영상 공통)
script.js            렌더링 엔진 — content.json의 타이밍대로 화면을 그린다
content.json          이번 영상의 대본/타이밍 데이터 (여기만 바꾸면 됨)
assets/images/         첨부 이미지
assets/audio/          내레이션 오디오
scripts/
  dev.js               미리보기 서버 (npm run dev)
  capture.js            프레임 캡처 (npm run capture)
  render.js             프레임 + 오디오 → MP4 (npm run render / video)
  static-server.js       내부용 정적 서버
  find-chromium.js        설치된 Chromium 자동 탐색
output/                생성된 프레임(frames/)과 video.mp4 (git에는 안 올라감)
```

## 1. 실행 방법 (미리보기)

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:4173` 접속. 1080x1920 화면이 창 크기에 맞춰
축소 표시되며, 대본이 자동으로 재생·반복된다. 실제 폰트 크기·타이밍·모션을
여기서 먼저 확인한다.

## 2. 새 대본 넣는 방법

`content.json`을 새 대본에 맞게 수정한다. 구조는 그대로 두고 **값만** 바꾼다.

- `title.text` : 게시글 제목 (2줄 이내 권장)
- `bodySections[]` : 문단 단위 블록. 한 블록에 줄을 3~4개 이하로 유지한다.
  각 줄(`lines[i]`)은 자신만의 `startTime`/`endTime`(ms)을 가진다 — 이 구간
  동안 그 줄이 "지금 읽히는 문장"으로 강조된다.
- `emphasis` : 레이아웃을 깨고 화면 중앙에 크게 보여줄 한 문장
- `conclusion.lines[]` / `conclusion.strongText` : 마무리 문장들과, 그 중
  가장 강하게(핑크색 + pulse) 강조할 단어
- `comment.text` : 마지막에 아래에서 올라오는 댓글 (TTS로 읽지 않는 텍스트)
- `meta.durationMs` : 전체 영상 길이(ms). 모든 구간의 `endTime`은 이 값을
  넘지 않아야 한다.

> 팁: 각 구간의 시간이 겹치지 않게(그리고 사이가 너무 뜨지 않게) 순서대로
> 채우면 된다. `npm run dev`로 바로바로 확인하면서 조정하는 게 가장 빠르다.

## 3. 이미지 교체 방법

1. 이미지 파일을 `assets/images/`에 넣는다.
2. `content.json`의 `image` 값을 채운다.

```json
"image": {
  "src": "assets/images/post1.jpg",
  "caption": "첨부 이미지",
  "startTime": 2500,
  "endTime": 8200
}
```

- `src`가 `null`이면 이미지 영역은 자동으로 접혀서 레이아웃이 그대로 유지된다.
- 이미지는 게시글에 첨부된 사진처럼 둥근 모서리 카드 형태로 표시된다.
- 원칙상 한 영상에 0~2장만 사용한다 (`CLAUDE.md` 참고).

## 4. 타이밍 수정 방법

모든 시간 값은 **영상 시작(0ms) 기준 절대 시각**이다.

- 특정 문장이 화면에 늦게/빨리 나오게 하려면 그 줄의 `startTime`/`endTime`을
  조정한다.
- 문단 전체가 사라지는 타이밍은 그 문단(`bodySections[i]`) 자체의
  `startTime`/`endTime`으로 조절한다 (보통 첫 줄 시작 ~ 마지막 줄 끝과 맞춤).
- 강조 장면(`emphasis`)·결론(`conclusion`)·댓글(`comment`)도 동일하게 시작/
  종료 시각만 바꾸면 된다.
- 등장/퇴장 트랜지션 길이(150~300ms)는 `script.js`의 `ENTER_MS`, `EXIT_MS`
  상수로 전역 조정된다 — 특정 영상만을 위해 바꾸지 않는다.

## 5. MP4 출력 방법

```bash
npm run render
```

(`npm run video`도 동일한 명령이다.) 내부적으로 다음을 수행한다.

1. Playwright(Chromium)로 `content.json`의 타이밍대로 페이지를 프레임 단위로
   직접 제어해 `output/frames/frame_00001.png …`를 생성한다.
   (`window.renderAtTime(t)`를 프레임마다 호출하기 때문에 재생 속도와 무관하게
   항상 정확한 프레임이 나온다.)
2. 시스템에 **ffmpeg**가 설치되어 있으면 그 프레임들을 (있다면
   `content.json`의 `audio.narrationSrc` 오디오와 함께) 합쳐서
   `output/video.mp4`를 만든다.
3. ffmpeg가 없으면 프레임만 만들고 설치 안내를 출력한다. 설치 후 다시
   `npm run render`를 실행하면 이어서 MP4까지 만들어진다.

```bash
# ffmpeg가 없다면
sudo apt-get install ffmpeg      # Debian/Ubuntu
brew install ffmpeg              # macOS
```

프레임만 필요하면 `npm run capture`만 실행해도 된다.

### 내레이션 오디오를 넣고 싶다면

1. 오디오 파일(mp3 등)을 `assets/audio/`에 넣는다.
2. `content.json`의 `audio.narrationSrc`에 경로를 지정한다.
3. `npm run render`를 실행하면 영상 프레임과 함께 자동으로 합쳐진다.
4. 오디오 길이와 `meta.durationMs`가 크게 다르면 어색하게 잘릴 수 있으니
   서로 맞춰준다.

## Playwright 최초 설정

이 저장소는 Playwright의 `chromium` 브라우저를 사용해 프레임을 캡처한다.
최초 1회 아래를 실행해야 한다 (이미 설치되어 있다면 생략 가능).

```bash
npx playwright install chromium
```

사내망/샌드박스 등으로 다운로드가 막혀 있고 이미 다른 경로에 Chromium이
설치되어 있다면, `PLAYWRIGHT_CHROMIUM_PATH` 환경변수로 실행 파일 경로를
직접 지정할 수 있다.

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run render
```
