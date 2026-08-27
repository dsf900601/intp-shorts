# 화상회의형 숏츠 템플릿 (5인 참가자)

대사와 참가자 정보만 바꾸면 계속 재사용할 수 있는 9:16(1080×1920) 화상회의형 숏츠
템플릿입니다. 빌드 도구 없이 순수 HTML/CSS/JS로 만들어져 있어, 브라우저에서 바로
1080×1920 화면을 미리 볼 수 있습니다.

## 실행 방법 (미리보기)

의존성 설치가 필요 없습니다. 아래 둘 중 하나로 실행하세요.

```bash
node serve.js
# ▶ 미리보기 서버 실행 중: http://localhost:5173
```

브라우저에서 `http://localhost:5173` 접속하면 됩니다.

또는 서버 없이 `index.html`을 브라우저로 더블클릭해서 바로 열어도 동작합니다
(ES 모듈을 쓰지 않아 `file://` 로도 문제없이 로드됩니다).

화면 중앙에 실제 1080×1920 비율의 "영상 프레임"이 창 크기에 맞춰 스케일되어
보이고, 그 아래 미리보기 전용 컨트롤(처음부터 / 일시정지 / 오디오 켜기)이 있습니다.
컨트롤은 확인용이며 실제 영상에는 포함되지 않는 UI입니다.

영상은 자동 재생되며, 끝나면 처음부터 반복 재생됩니다.

## 파일 구조

```
index.html       화면 골격 (헤더 / 참가자 그리드 / 자막 / 엔딩 오버레이)
src/data.js      ★ 콘텐츠 데이터 — 새 에피소드를 만들 때 이 파일만 수정
src/style.css    레이아웃 · 카드 디자인 · 활성화 효과 · 애니메이션
src/app.js       렌더링 + 타임라인 엔진 (콘텐츠 로직 없음, 보통 건드릴 필요 없음)
serve.js         의존성 없는 로컬 정적 서버 (node serve.js)
```

**영상 UI(로직)와 콘텐츠(데이터)가 완전히 분리**되어 있습니다.
`src/data.js`만 교체하면 회사 회의, 조별과제, 소개팅 등 다른 소재로도
동일한 템플릿을 재사용할 수 있습니다.

## 구조 개요

### 참가자 배치

- 상단: `민수` / `INTP` 큰 카드 2개 (`role: "primary"`)
- 중단: 현재 발화자 이름 + 대사 자막 전용 영역 (이전 대사는 즉시 사라짐, 카톡식 로그 없음)
- 하단: `엄지` / `지영` / `현우` 작은 카드 3개 (`role: "reaction"`, `"background"`)
- 맨 아래: 장식용 가상 화상회의 컨트롤 바 (마이크/카메라/참가자/채팅/종료 아이콘, 기능 없음)
- 헤더: 모임 제목 + 통화시간(경과 시간에 따라 자동 증가)

레이아웃은 CSS Flexbox 세로 배치(`src/style.css`의 `.stage`)로 5개 구역
(헤더 → primary 그리드 → **자막 영역** → secondary 그리드 → 컨트롤 바)을
순서대로 쌓는 방식입니다. 자막 영역은 나머지 4개 구역이 차지한 높이를 뺀
공간을 모두 차지하는 `flex: 1`이라서, 대사 길이와 무관하게 항상 화면 세로
약 52~62% 지점(메인 2인 카드 아래 · 하단 3인 카드 위)에 위치합니다.

참가자 카드는 실제 화상회의 앱의 "카메라 꺼짐" 타일처럼, 참가자 색상의 큰
원형 아바타(간결한 벡터 얼굴 포함)를 중앙에 크게 배치하고 이름은 카드
좌하단에 작은 배지로 오버레이했습니다.

### 화자 활성화 방식

`src/app.js`가 매 프레임(`requestAnimationFrame`) 현재 재생 시간(`t`)을 계산하고,
`dialogue` 배열에서 `t`가 `start ~ start+duration` 사이에 들어가는 항목을 찾아
해당 `speakerId`의 카드에만 `.active` 클래스를 붙입니다.

- `role: "background"`인 참가자(지영, 현우)는 애초에 활성화 후보에서
  코드 레벨로 제외됩니다 (`speakableDialogue` 필터링) — 데이터 실수로 넣어도
  화면에 반영되지 않도록 이중 안전장치입니다.
- 활성화 시 카드 테두리 + 아바타 주변 링 글로우 + 4칸 오디오 미터 애니메이션이
  켜지고, 전환은 CSS `transition`으로 자연스럽게 처리됩니다(번쩍임 없음).
- `role: "reaction"`(엄지)은 활성화 색상이 앰버색으로 구분되고, 리액션 중에만
  카드가 1.03배로 아주 미세하게 커졌다 리액션이 끝나면 즉시 원래 크기로
  돌아옵니다(과한 줌/바운스 없음).

### 정적(침묵) 처리

별도의 "침묵" 데이터 항목이 없습니다. `dialogue`의 각 항목 `start` 값 사이에
의도적으로 시간차를 두면, 그 구간 동안은 어떤 대사의 `start~end` 범위에도
속하지 않으므로 자동으로 **아무도 활성화되지 않고 자막도 사라지는 정적 구간**이
됩니다 (예: INTP 대사가 11.1초에 끝나고 다음 대사가 11.4초에 시작 → 0.3초 정적).

### 대화 데이터 관리 방식

`src/data.js`의 `TEMPLATE.dialogue` 배열 하나로 전체 대화를 관리합니다.
각 항목은 `{ speakerId, text, start, duration, type?, audio? }` 형태이며,
이 배열만 교체하면 새로운 에피소드가 만들어집니다.

### 러닝타임 제어 방식

전체 길이는 코드가 아니라 데이터로 결정됩니다.

```
talkEnd      = 마지막 대사의 start + duration
endingStart  = talkEnd + endingDelay   (마지막 정적)
totalDuration = endingStart + endingHold (엔딩 문구 유지 시간)
```

`endingDelay`, `endingHold`도 `src/data.js`에 있는 값이라, 대사를 늘리거나
줄이면 전체 러닝타임이 자동으로 재계산됩니다. 현재 데이터 기준 총 길이는
약 23초입니다 (목표 20~25초 충족).

## 내가 수정하기 쉬운 값 — 전부 `src/data.js` 안에 있습니다

| 수정하고 싶은 값 | 위치 (`src/data.js`) |
|---|---|
| 모임 제목 / 부제 / 시작 통화시간 | `TEMPLATE.meetingTitle`, `meetingSubtitle`, `startClock` |
| 참가자 이름 | `TEMPLATE.participants[].name` |
| 참가자 역할 (primary/reaction/background) | `TEMPLATE.participants[].role` |
| 참가자 이미지 (아바타) | `TEMPLATE.participants[].avatar.color`(배경색) / `avatar.initial`(이니셜) — 실제 이미지를 쓰려면 `avatar.image: "/img/파일명.png"` 추가 (있으면 이니셜 대신 이미지 사용) |
| 참가자 음성 파일 경로 | `TEMPLATE.participants[].voice` (예: `/audio/minsu_01.wav`) |
| 대사 내용 | `TEMPLATE.dialogue[].text` |
| 대사 시작 시간 | `TEMPLATE.dialogue[].start` (초 단위) |
| 대사 길이 | `TEMPLATE.dialogue[].duration` (초 단위) |
| 엄지 리액션 (탄성) | `TEMPLATE.dialogue[]`에서 `speakerId: "umji"`, `type: "reaction"`인 항목의 `text` |
| 대사별 전용 음원 | `TEMPLATE.dialogue[].audio` (없으면 참가자 기본 `voice` 사용) |
| 마지막 엔딩 문구 | `TEMPLATE.endingText` |
| 엔딩 전 정적 길이 / 엔딩 유지 시간 | `TEMPLATE.endingDelay`, `TEMPLATE.endingHold` |

새 소재(회사 회의, 소개팅 등)로 바꾸고 싶다면 `participants`의 이름/역할과
`dialogue` 배열, `endingText`만 통째로 교체하면 됩니다. `index.html`, `style.css`,
`app.js`는 수정할 필요가 없습니다.

## 확장 예정 사항 (현재 구조가 이미 지원)

- **음원(TTS) 연결**: `participants[].voice` / `dialogue[].audio`에 파일 경로만
  넣으면 재생됩니다(`audio/` 폴더에 실제 파일 추가 필요). 지금은 파일이 없어도
  에러 없이 무시되도록 처리해뒀습니다. 미리보기 화면의 "🔈 오디오 켜기" 버튼을
  눌러야 브라우저 자동재생 정책에 걸리지 않고 소리가 재생됩니다.
- **실제 아바타 이미지**: `avatar.image` 필드만 추가하면 이니셜 원형 대신
  이미지가 표시됩니다.
- **다른 소재로 재사용**: 데이터 구조(`meetingTitle`, `participants`,
  `dialogue`, `endingText` 등)가 소재에 종속되지 않도록 설계되어 있어,
  회사 회의 / 조별과제 / 소개팅 / 게임 음성채팅 등 어떤 소재든 같은 스키마로
  바로 제작 가능합니다.
