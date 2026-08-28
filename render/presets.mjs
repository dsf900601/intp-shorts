/**
 * 렌더링용 "상태(state)" 프리셋 정의.
 * 각 항목은 "이 참가자 한 명만, 지정된 표정으로, 클립 내내 활성화"를 의미한다.
 * 새 상태를 추가하고 싶으면 이 배열에 한 줄만 추가하면 된다(코드 변경 불필요).
 *
 * reaction:true 인 항목은 해당 참가자에게 실제 reactionAvatarSrc 에셋(파일)이
 * 있을 때만 렌더링된다. 없으면 render-assets.mjs가 자동으로 건너뛰고 그 이유를
 * 콘솔에 출력한다 — 새 캐릭터/얼굴을 임의로 만들어 채우지 않는다.
 */
export const PRESETS = [
  { name: "minsu-active", speakerId: "minsu", reaction: false },
  { name: "minsu-reaction", speakerId: "minsu", reaction: true },
  { name: "intp-active", speakerId: "intp", reaction: false },
  { name: "intp-reaction", speakerId: "intp", reaction: true },
  { name: "umji-active", speakerId: "umji", reaction: false },
  { name: "umji-reaction", speakerId: "umji", reaction: true },
];
