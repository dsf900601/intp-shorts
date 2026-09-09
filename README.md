# intp-shorts

INTP 농구 시리즈 숏츠(9:16) 제작 프로젝트.

## 구조

```
shared/design-system/   기존 숏츠 1~3편에서 추출한 공용 디자인 시스템
                         (색상/폰트/컴포넌트 CSS + timeline 기반 재생 엔진).
                         새 숏폼을 만들 때 새 디자인을 만들지 말고 이걸 재사용할 것.
shorts/<이름>/           숏폼별 프로젝트. 대본/타이밍(timeline.json), 재생 페이지
                         (index.html), 렌더 스크립트(render/), 오디오(audio/)를 담음.
```

## 현재 포함된 숏폼

- `shorts/롱폼02_숏폼04/` — "INTP가 우연히 잘된 일을 그냥 못 넘기는 이유"
  (자세한 내용은 해당 폴더의 README.md 참고)

## 새 숏폼 만들기

1. `shorts/<새폴더>/`에 `index.html`(기존 숏폼의 것을 복사해서 경로만 확인),
   `timeline.json`(대본/강조/댓글 cue)을 작성
2. `shared/design-system/`의 CSS/JS는 그대로 import (수정하지 말 것 —
   전 시리즈 톤이 깨짐)
3. `render/capture.mjs`, `render/render.sh`도 기존 숏폼에서 복사해서
   경로/파일명만 맞추면 됨
