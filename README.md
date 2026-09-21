# intp-shorts

「인치디 관찰일지」 Instagram Reels 자동화 시스템의 첫 프로토타입.
[Remotion](https://www.remotion.dev/)(React 기반 영상 렌더링)으로 만든, 콘텐츠 데이터만
바꾸면 새 릴스를 뽑을 수 있는 재사용 가능한 템플릿입니다.

- 계정: `@intp.adhd`
- 시리즈: 인치디 관찰일지
- 현재 에피소드: `#001` (`src/content/observation-001.ts`)

모든 비주얼은 코드로 그린 그림이 아니라, 실제 「인치디 관찰일지 #001」 인스타그램
피드 캐러셀 4장(`public/source/observation-001/feed-1..4.jpg`)을 장면별로 crop한
것입니다. 캐릭터를 코드로 다시 그리지 않습니다.

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
  theme.ts                  safe-zone 등 디자인 토큰
  font.ts / fontData.ts     손글씨 폰트(Gaegu, 한글 포함) base64 임베드
  content/
    types.ts                Scene/EpisodeData/ImageCrop 타입 정의
    observation-001.ts      #001 콘텐츠 데이터 (자막 + 소스 이미지 crop 좌표 + 타이밍)
  scenes/
    ObservationScene.tsx     Scene 하나 = FeedImage + Caption + 크로스페이드
  components/
    FeedImage.tsx            소스 이미지를 crop 좌표로 cover-fit + 아주 약한 Ken Burns
    Caption.tsx              자막 레이어 (흰 글자 + 외곽선 + 그림자 + 배경 스크림)
public/
  audio/                    내레이션 wav 위치 (없어도 렌더링됨, README 참고)
  fonts/                    self-host된 Gaegu 폰트 파일
  source/observation-001/   실제 피드 원본 4장 (feed-1.jpg ~ feed-4.jpg, 1254x1254)
```

## Scene 데이터 구조

```ts
{
  id: "s05-question",
  duration: 90,              // frames @30fps
  emphasis: true,             // 더 큰 자막 (피벗/결론 Scene용)
  text: ["왜 오늘은 나한테", "공이 자꾸 오지?"],
  image: {
    source: "feed-3",         // sourceImages 키
    crop: { x: 0, y: 560, w: 560, h: 500 }, // 소스 이미지(1254x1254) 안의 픽셀 영역
    motion: "zoomIn",         // zoomIn | panLeft/Right/Up/Down | none
  },
}
```

`FeedImage`가 `crop`을 1080x1920 프레임에 "cover"로 맞추고(비율이 안 맞으면 자동으로
한쪽만 다듬음), 아주 약한 scale/이동만 얹습니다. 자막은 원본 이미지 속 글자를 절대
재사용하지 않고 `Caption`이 별도 레이어로 그립니다.

## 다음 에피소드(#002, #003...) 만들 때

1. 새 에피소드의 피드 원본 이미지를 `public/source/<episode-id>/feed-N.jpg`로 넣는다.
2. `src/content/observation-002.ts` 같은 새 파일을 만들어 `sourceImages`,
   `sourceNaturalSize`, `scenes`(자막 + crop 좌표 + duration)를 채운다 -
   `observation-001.ts`가 그대로 예제/템플릿이다.
3. `src/Root.tsx`의 `defaultProps.episodeData`를 새 파일로 바꾼다
   (또는 여러 편을 한 번에 두려면 Composition을 하나 더 추가한다).
4. 새 대사에 기존 폰트 서브셋에 없는 한글 글자가 있으면
   `node scripts/embed-font.js` 안내 주석(`src/font.ts` 상단)을 따라
   폰트 서브셋을 다시 받는다.
5. 실제 음성이 생기면 `public/audio/reel-XXX.wav`에 넣기만 하면 된다
   (코드 수정 불필요, `calculateMetadata`가 자동 감지).

컴포넌트(`components/`, `scenes/`)는 에피소드마다 복사하지 않는다 — 데이터만 바뀐다.

원본 피드 이미지가 아직 없는 미래 에피소드를 위해, 이전 "코드로 그린 손그림
캐릭터" 프로토타입 컴포넌트들은 git 히스토리에 남아 있다 (이번 리디자인에서 제거).
