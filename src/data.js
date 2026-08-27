/**
 * ============================================================================
 *  콘텐츠 데이터 파일 — 이 파일만 수정하면 새 에피소드를 만들 수 있습니다.
 *  (UI/애니메이션 로직은 src/app.js, src/style.css 에 있고 여긴 절대 건드릴 필요 없음)
 * ============================================================================
 */

const TEMPLATE = {
  // ── 상단 헤더 ──────────────────────────────────────────────────────────
  meetingTitle: "📚 독서모임 #12",     // 헤더 최상단 큰 글씨
  meetingSubtitle: "독서모임 정기모임", // (현재 UI에서는 title 한 줄만 노출, 필요 시 app.js에서 사용 가능)
  startClock: "21:37",                 // 화면 우하단 통화시간의 시작 값 (재생 경과 시간만큼 자동으로 올라감)

  // ── 참가자 목록 ────────────────────────────────────────────────────────
  // role: "primary"(주 화자) | "reaction"(짧은 리액션만) | "background"(끝까지 발화 없음)
  //
  // avatarSrc        참가자 얼굴/상반신 이미지 경로. 카드 안을 꽉 채워 표시됩니다
  //                   (object-fit: cover). 파일이 없거나 로드에 실패하면 자동으로
  //                   avatar.color/initial 벡터 얼굴로 폴백되므로 이미지 한 장이
  //                   빠져도 전체 UI는 깨지지 않습니다.
  // avatarPosition   크롭 시 얼굴이 잘리지 않도록 하는 object-position 값.
  //                   예: "50% 30%" = 가로 중앙, 세로 위쪽 30% 지점을 기준으로 크롭.
  // reactionAvatarSrc(선택) 이 참가자가 활성화(발화/리액션)되는 동안만 잠깐
  //                   바꿔 보여줄 이미지. 리액션이 끝나면 즉시 avatarSrc로 복귀.
  //                   지금은 "엄지"에만 지정했지만 필드 자체는 범용이라 다른
  //                   참가자에게 붙여도 동일하게 동작합니다.
  //
  // 아직 실제 캐릭터 아트(minsu.png 등)가 없으므로 assets/avatars/ 아래 파일명만
  // 미리 정해둔 상태입니다. 같은 파일명으로 이미지를 넣기만 하면 코드 수정 없이
  // 바로 반영됩니다 (assets/avatars/README.md 참고).
  //
  // 캐릭터 디자인 방향 (실제 원화 제작 시 참고용 — 세밀한 차이만 두고 같은
  // 일러스트 스타일/카메라 거리/조명 톤을 공유하는 "같은 세트"처럼 만들 것):
  //   민수    : 둥근 눈, 자연스러운 표정, 살짝 올라간 입꼬리 — 부드럽고 친근한 인상
  //   INTP   : 차분한 눈매, 표정 변화 적음, 입은 거의 일자, 안경 또는 단정한
  //            헤어스타일 — 분석적이지만 음침하지 않은 중립적 인상
  //   엄지    : 눈을 조금 크게, 표정 변화가 잘 드러나는 얼굴 — 기본은 평범한 표정,
  //            reactionAvatarSrc는 놀란/당황한 표정으로 제작
  //   지영    : 부드러운 눈매, 민수와는 다른 얼굴형 — 차분한 기본 표정
  //   현우    : 민수/INTP와 다른 눈썹·눈 모양, 다른 헤어스타일 — 무난한 기본 표정
  participants: [
    {
      id: "minsu",
      name: "민수",
      role: "primary",
      avatar: { color: "#4C6EF5", initial: "민" }, // 이미지 없을 때 쓰는 폴백 벡터 얼굴
      avatarSrc: "./assets/avatars/minsu.png",
      avatarPosition: "50% 32%",
      voice: "/audio/minsu_01.wav", // 참가자 기본 음색 (추후 TTS 연결용, 지금은 미사용)
    },
    {
      id: "intp",
      name: "INTP",
      role: "primary",
      avatar: { color: "#12B886", initial: "T" },
      avatarSrc: "./assets/avatars/intp.png",
      avatarPosition: "50% 32%",
      voice: "/audio/intp_01.wav",
    },
    {
      id: "umji",
      name: "엄지",
      role: "reaction",
      avatar: { color: "#F59F00", initial: "엄" },
      avatarSrc: "./assets/avatars/umji.png",
      reactionAvatarSrc: "./assets/avatars/umji-reaction.png", // 리액션 순간에만 임시 사용
      avatarPosition: "50% 28%",
      voice: "/audio/umji_reaction_01.wav",
    },
    {
      id: "jiyoung",
      name: "지영",
      role: "background",
      avatar: { color: "#868E96", initial: "지" },
      avatarSrc: "./assets/avatars/jiyoung.png",
      avatarPosition: "50% 28%",
    },
    {
      id: "hyunwoo",
      name: "현우",
      role: "background",
      avatar: { color: "#868E96", initial: "현" },
      avatarSrc: "./assets/avatars/hyunwoo.png",
      avatarPosition: "50% 28%",
    },
  ],

  // ── 대화 데이터 ────────────────────────────────────────────────────────
  // speakerId 는 위 participants[].id 와 일치해야 합니다.
  // start / duration 단위는 "초". 두 줄 사이에 의도적으로 시간차를 두면
  // 그 구간이 자동으로 "정적(모두 비활성)"으로 처리됩니다. (별도 silence 항목 불필요)
  // type: "reaction" 을 붙이면 리액션 전용 자막 스타일이 적용됩니다.
  // audio: 이 대사 전용 음원 파일 경로 (없으면 participant.voice 사용, 그것도 없으면 무음)
  dialogue: [
    {
      speakerId: "minsu",
      text: "저는 이 장면에서 작가가 현대인의 외로움을 표현했다고 생각했어요.",
      start: 0,
      duration: 4.2,
    },
    {
      speakerId: "intp",
      text: "근데 작가가 그렇게 말했어요?",
      start: 4.2,
      duration: 2.2,
    },
    {
      speakerId: "minsu",
      text: "아뇨. 그건 제 해석이죠.",
      start: 6.4,
      duration: 2.0,
    },
    {
      speakerId: "intp",
      text: "그럼 작가가 표현한 건 아니잖아요.",
      start: 8.4,
      duration: 2.7,
    },
    // ↑ 8.4~11.1초 발화 후, 다음 대사가 11.4초에 시작 → 0.3초 정적이 자동 발생
    {
      speakerId: "umji",
      text: "어?",
      start: 11.4,
      duration: 0.6,
      type: "reaction",
      audio: "/audio/umji_reaction_01.wav",
    },
    {
      speakerId: "intp",
      text: "우리가 그렇게 해석한 거지.",
      start: 12.1,
      duration: 2.1,
    },
    {
      speakerId: "minsu",
      text: "뭐… 그렇긴 한데요.",
      start: 14.2,
      duration: 1.8,
    },
    {
      speakerId: "intp",
      text: "근데 왜 작가가 표현했다고 해요?",
      start: 16.0,
      duration: 2.8,
    },
    // ↑ 마지막 대사 종료(18.8초) 이후 endingDelay(0.7초) 동안 전원 정적 → 엔딩 문구
  ],

  // ── 엔딩 ──────────────────────────────────────────────────────────────
  endingText: "근데 애는 착함.",
  endingDelay: 0.7,   // 마지막 대사가 끝난 뒤 엔딩 문구가 뜨기까지의 정적(초)
  endingHold: 3.5,    // 엔딩 문구가 화면에 유지되는 시간(초) — 이후 처음부터 반복 재생
};
