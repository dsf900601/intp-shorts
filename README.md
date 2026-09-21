# intp-shorts

「인치디 관찰일지」 Instagram Reels 자동화 시스템의 첫 프로토타입.
[Remotion](https://www.remotion.dev/)(React 기반 영상 렌더링)으로 만든, 콘텐츠 데이터만
바꾸면 새 릴스를 뽑을 수 있는 재사용 가능한 템플릿입니다.

- 계정: `@intp.adhd`
- 시리즈: 인치디 관찰일지
- 현재 에피소드: `#001` (`src/content/observation-001.ts`)

## 빠른 시작

```bash
npm install
npm run start    # Remotion Studio (미리보기 + 타임라인 스크러빙)
npm run render   # out/reel-001.mp4 렌더링
npm run still    # 대표 프레임 1장을 PNG로 출력
```

렌더링에는 시스템 `ffmpeg`(libx264 포함)가 필요합니다. 이 컨테이너 환경에서는
`apt-get install -y ffmpeg`로 설치했습니다.

## 구조

```
src/
  index.ts                 Remotion 엔트리 (registerRoot)
  Root.tsx                 Composition 정의 (1080x1920, 30fps, 오디오 유무 감지)
  ObservationReel.tsx       재사용 엔진 - episodeData만 받아서 Scene들을 순서대로 재생
  theme.ts                  색상/폰트/safe-zone 등 디자인 토큰
  font.ts / fontData.ts     손글씨 폰트(Gaegu, 한글 포함) 임베드
  content/
    types.ts                Scene/EpisodeData 타입 정의
    observation-001.ts      #001 콘텐츠 데이터 (텍스트/타이밍/비주얼 종류)
  scenes/
    ObservationScene.tsx     Scene 하나의 레이아웃(텍스트 + 비주얼 + safe zone)
    SceneVisual.tsx          visual.kind별 비주얼 렌더링(character, court, questionMarks 등)
  components/                재사용 가능한 손그림 컴포넌트
    Character.tsx, Basketball.tsx, Court.tsx, PlayerMarker.tsx,
    QuestionMark.tsx, Arrow.tsx, SceneText.tsx, EpisodeLabel.tsx,
    PaperBackground.tsx, SceneFrame.tsx, RoughShape.tsx, sketch.ts
public/
  audio/                    내레이션 wav 위치 (없어도 렌더링됨, README 참고)
  characters/               캐릭터 PNG 에셋 슬롯 (pose별, 없어도 렌더링됨, README 참고)
  fonts/                    self-host된 Gaegu 폰트 파일
```

캐릭터는 코드로 그리지 않는다. `Character.tsx`는 `pose`(예: `thinking`,
`basketball`, `curious`, `analyzing`, `realization`)에 맞는
`public/characters/<pose>.png`를 불러오는 에셋 슬롯이며, 파일이 없으면
점선 placeholder를 대신 보여준다. 기존 인스타그램 피드의 실제 캐릭터 아트를
그대로 이 파일명으로 내보내면 코드 수정 없이 반영된다 (`public/characters/README.md` 참고).

## 다음 에피소드(#002, #003...) 만들 때

1. `src/content/observation-001.ts`를 복사해 `observation-002.ts` 등을 만들고
   `episode`, `scenes[].text` 등 내용만 채운다.
2. `src/Root.tsx`의 `defaultProps.episodeData`를 새 파일로 바꾼다
   (또는 여러 편을 한 번에 두려면 Composition을 하나 더 추가한다).
3. 새 대사에 기존 폰트 서브셋에 없는 한글 글자가 있으면
   `node scripts/embed-font.js` 안내 주석(`src/font.ts` 상단)을 따라
   폰트 서브셋을 다시 받는다.
4. 실제 음성이 생기면 `public/audio/reel-XXX.wav`에 넣기만 하면 된다
   (코드 수정 불필요, `calculateMetadata`가 자동 감지).
5. 새 pose가 필요하면 `CharacterPose`(`src/content/types.ts`)에 이름을 추가하고
   `public/characters/<pose>.png`를 넣는다.

컴포넌트(`components/`, `scenes/`)는 에피소드마다 복사하지 않는다 — 데이터만 바뀐다.
