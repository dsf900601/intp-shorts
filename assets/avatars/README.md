# 참가자 아바타 이미지

`src/data.js`의 `avatarSrc` / `reactionAvatarSrc`가 가리키는 실제 이미지 파일을
넣는 폴더입니다. 아래 5개 파일명으로 이미지를 넣기만 하면 코드 수정 없이
바로 반영됩니다 (`src/style.css`, `src/app.js`는 건드릴 필요 없음).

```
assets/avatars/
├── minsu.png
├── intp.png
├── umji.png
├── umji-reaction.png   ← 엄지가 "어?", "엥?" 리액션할 때만 잠깐 표시 (선택)
├── jiyoung.png
└── hyunwoo.png
```

## 이미지 스펙 권장값

- 인물 얼굴~상반신이 프레임 대부분을 채우는 세로 구도 (예: 3:4 또는 1:1),
  카드 안에서 `object-fit: cover`로 크롭되므로 얼굴이 중앙 상단 쪽에 오도록
  구도를 잡아주세요.
- 5장 모두 동일한 카메라 거리 / 화면비 / 조명 톤 / 배경 톤 / 캐릭터 렌더링
  스타일을 공유해야 "같은 캐릭터 세트"처럼 보입니다. (참고: 얼굴이 어느
  지점에서 잘리는지가 이미지마다 다르면 `data.js`의 `avatarPosition`
  값으로 참가자별 크롭 기준점을 조정할 수 있습니다.)
- 파일이 없거나 로드에 실패해도 UI는 깨지지 않고, `src/data.js`에 지정한
  `avatar.color` / `avatar.initial` 벡터 얼굴로 자동 폴백됩니다.

## 캐릭터 디자인 방향

세부 방향은 `src/data.js`의 `participants` 배열 주석에 참가자별로
정리되어 있습니다 (민수/INTP/엄지/지영/현우 각각의 눈·눈썹·입·표정 방향).
과장된 차이보다는, 같은 일러스트 스타일 안에서 미세하게 구별되는 정도를
목표로 합니다.
