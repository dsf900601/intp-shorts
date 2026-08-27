/**
 * ============================================================================
 *  렌더링 + 타임라인 엔진
 *  콘텐츠(대사/참가자/제목)를 바꾸고 싶다면 이 파일이 아니라 src/data.js 를 수정하세요.
 * ============================================================================
 */
(function () {
  "use strict";

  const {
    meetingTitle,
    startClock,
    participants,
    dialogue,
    endingText,
    endingDelay = 0.6,
    endingHold = 3.5,
    introTag, // (선택) { text, duration } — 영상 시작 0~n초에 잠깐 뜨는 상황 태그. TTS로 읽지 않음
  } = TEMPLATE;
  const introDuration = introTag ? introTag.duration : 0;

  // ── DOM 참조 ─────────────────────────────────────────────────────────
  const stageWrapper = document.getElementById("stageWrapper");
  const stage = document.getElementById("stage");
  const gridPrimary = document.getElementById("gridPrimary");
  const gridSecondary = document.getElementById("gridSecondary");
  const meetingTitleEl = document.getElementById("meetingTitle");
  const meetingClockEl = document.getElementById("meetingClock");
  const subtitleArea = document.getElementById("subtitleArea");
  const subtitleSpeaker = document.getElementById("subtitleSpeaker");
  const subtitleText = document.getElementById("subtitleText");
  const endingOverlay = document.getElementById("endingOverlay");
  const endingTextEl = document.getElementById("endingText");
  const timeReadout = document.getElementById("timeReadout");
  const btnRestart = document.getElementById("btnRestart");
  const btnPause = document.getElementById("btnPause");
  const btnAudio = document.getElementById("btnAudio");

  meetingTitleEl.textContent = meetingTitle;
  endingTextEl.textContent = endingText;

  // ── 참가자 맵 + 카드 DOM 생성 ────────────────────────────────────────
  const participantById = {};
  const cardEls = {};

  participants.forEach((p) => {
    participantById[p.id] = p;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = p.id;
    card.dataset.role = p.role;

    const tint = p.avatar?.color || "#555";
    const position = p.avatarPosition || "50% 32%";
    // avatarSrc가 있으면 카드를 꽉 채우는 실제 이미지를, 없거나 로드에
    // 실패하면(onerror) 참가자 색상 원 + 추상 벡터 얼굴로 자동 폴백한다.
    // 이미지 한 장이 빠져도 전체 UI는 깨지지 않는다.
    const imgTag = p.avatarSrc
      ? `<img class="avatar-img" src="${p.avatarSrc}" alt="${p.name}"
             style="object-position:${position}"
             onerror="this.style.display='none'" />`
      : "";

    card.innerHTML = `
      <div class="avatar-frame" style="--tint:${tint}">
        <div class="avatar-fallback">
          <div class="avatar-circle" style="background:${tint}">
            <div class="avatar-face">
              <span class="af-eye af-eye--l"></span>
              <span class="af-eye af-eye--r"></span>
              <span class="af-mouth"></span>
            </div>
          </div>
        </div>
        ${imgTag}
      </div>
      <div class="name-badge">
        <span class="name">${p.name}</span>
        <div class="meter"><span></span><span></span><span></span><span></span></div>
      </div>
    `;

    (p.role === "primary" ? gridPrimary : gridSecondary).appendChild(card);
    cardEls[p.id] = card;
  });

  // ── 통화시간 표시 ("21:37" + 경과시간) ──────────────────────────────
  function parseClock(str) {
    const [m, s] = String(str || "0:00").split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  function formatClock(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const clockBaseSeconds = parseClock(startClock);

  // ── 타임라인 계산 ────────────────────────────────────────────────────
  // 화면 활성화는 role이 primary/reaction인 참가자만 가능 (background는 항상 제외)
  const speakableDialogue = dialogue.filter((d) => {
    const p = participantById[d.speakerId];
    return p && p.role !== "background";
  });

  const lastSeg = speakableDialogue[speakableDialogue.length - 1];
  const talkEnd = lastSeg ? lastSeg.start + lastSeg.duration : 0;
  const endingStart = talkEnd + endingDelay;
  const totalDuration = endingStart + endingHold;

  function findSegment(t) {
    return (
      speakableDialogue.find((d) => t >= d.start && t < d.start + d.duration) || null
    );
  }

  // ── 오디오 (선택 사항 — 파일이 없어도 안전하게 무시됨) ───────────────
  let audioEnabled = false;
  const audioCache = {};
  function getAudio(src) {
    if (!src) return null;
    if (!audioCache[src]) {
      const a = new Audio(src);
      audioCache[src] = a;
    }
    return audioCache[src];
  }
  function playSegmentAudio(seg) {
    if (!audioEnabled || !seg) return;
    const p = participantById[seg.speakerId];
    const src = seg.audio || (p && p.voice);
    const audio = getAudio(src);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* 파일이 아직 없거나 자동재생이 막힌 경우 조용히 무시 */
    });
  }

  btnAudio.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    btnAudio.textContent = audioEnabled ? "🔊 오디오 켜짐" : "🔈 오디오 켜기";
  });

  // ── 카드 활성화 / 자막 상태 갱신 ─────────────────────────────────────
  let activeId = null;
  let activeIsReaction = false; // activeId로 지금 표시 중인 세그먼트가 reaction 타입인지
  let activeSegKey = null;

  // 짧은 fade로만 이미지를 바꾼다. reactionAvatarSrc가 없는 참가자에게는
  // 아무 영향이 없다.
  function crossfadeAvatar(id, nextSrc) {
    const p = participantById[id];
    const img = cardEls[id] && cardEls[id].querySelector(".avatar-img");
    if (!p || !img || !nextSrc || img.dataset.src === nextSrc) return;
    img.dataset.src = nextSrc;
    img.classList.add("avatar-swap");
    setTimeout(() => {
      if (img.dataset.src !== nextSrc) return; // 그 사이 다시 바뀌었으면 무시
      img.src = nextSrc;
      img.classList.remove("avatar-swap");
    }, 150);
  }

  // 지금 활성화된 세그먼트가 type:"reaction"일 때만 잠깐
  // reactionAvatarSrc(예: 엄지의 놀란 표정)로 바꾸고, 그 외에는(같은 참가자가
  // 이어서 긴 대사를 해도) 항상 기본 avatarSrc를 유지한다. "리액션 전환"은
  // role이 아니라 이 세그먼트 단위 플래그로만 판단해야, 엄지처럼 reaction
  // 카드가 여러 줄을 말해도 놀란 표정이 계속 붙어있지 않는다.
  function applyAvatarForActivation(id, isReaction) {
    const p = participantById[id];
    if (!p || !p.reactionAvatarSrc) return;
    crossfadeAvatar(id, isReaction ? p.reactionAvatarSrc : p.avatarSrc);
  }

  function setActiveCard(id, isReaction) {
    if (id === activeId) {
      // 화자는 그대로인데 세그먼트의 reaction 여부만 바뀐 경우(예: reaction
      // 대사 다음에 같은 참가자의 일반 대사가 gap 없이 바로 이어지는 경우)
      // 카드 활성 스타일은 유지한 채 아바타 이미지만 다시 맞춘다.
      if (isReaction !== activeIsReaction) {
        activeIsReaction = isReaction;
        applyAvatarForActivation(id, isReaction);
      }
      return;
    }

    if (activeId && cardEls[activeId]) {
      cardEls[activeId].classList.remove("active");
      applyAvatarForActivation(activeId, false); // 비활성화되면 항상 기본 이미지로 복귀
    }

    activeId = id;
    activeIsReaction = isReaction;

    if (id && cardEls[id]) {
      cardEls[id].classList.add("active");
      applyAvatarForActivation(id, isReaction);
    }
  }

  // 대사 중 [대괄호]로 감싼 부분만 기존 강조색으로 표시한다. 화면 하나에
  // 보통 1군데만 쓰는 걸 전제로, 첫 번째 [..] 구간만 강조 처리한다.
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSubtitleText(text) {
    const match = text.match(/\[([^\]]+)\]/);
    if (!match) {
      subtitleText.textContent = text;
      return;
    }
    const before = text.slice(0, match.index);
    const emphasized = match[1];
    const after = text.slice(match.index + match[0].length);
    subtitleText.innerHTML =
      escapeHtml(before) +
      `<span class="subtitle-emphasis">${escapeHtml(emphasized)}</span>` +
      escapeHtml(after);
  }

  function updateSubtitle(seg) {
    const key = seg ? `${seg.speakerId}-${seg.start}` : null;
    if (key === activeSegKey) return;
    activeSegKey = key;

    if (!seg) {
      subtitleArea.classList.remove("visible");
      return;
    }

    const p = participantById[seg.speakerId];
    subtitleSpeaker.textContent = p ? p.name : seg.speakerId;
    renderSubtitleText(seg.text);
    // 자막 강조색은 "이 세그먼트가 reaction 타입인가"가 아니라 "이 참가자의
    // role이 reaction인가"로 결정한다 — 그래야 엄지가 긴 대사를 이어가도
    // 카드 테두리 색(role 기준)과 자막 색이 항상 같이 간다.
    subtitleArea.dataset.type = p && p.role === "reaction" ? "reaction" : "normal";
    subtitleArea.classList.add("visible");

    playSegmentAudio(seg);
  }

  // 영상 시작 직후 잠깐 뜨는 상황 태그("독서모임 중" 등). 화자 카드는
  // 아무것도 활성화하지 않고, TTS도 붙지 않는다(대사가 아니라 상태 표시이므로
  // playSegmentAudio를 아예 거치지 않는다). 기존 자막 영역(subtitle-card)을
  // 그대로 재사용하되, 이름 배지가 아니라 태그 텍스트 한 줄만 보여준다.
  function showIntroTag(tag) {
    const key = "intro";
    if (activeSegKey === key) return;
    activeSegKey = key;

    subtitleSpeaker.textContent = tag.text;
    subtitleText.textContent = "";
    subtitleArea.dataset.type = "normal";
    subtitleArea.classList.add("visible");
  }

  function render(t) {
    meetingClockEl.textContent = formatClock(clockBaseSeconds + t);

    if (introTag && t < introDuration) {
      setActiveCard(null, false);
      showIntroTag(introTag);
      endingOverlay.classList.remove("visible");
    } else if (t < talkEnd) {
      const seg = findSegment(t);
      setActiveCard(seg ? seg.speakerId : null, !!(seg && seg.type === "reaction"));
      updateSubtitle(seg);
      endingOverlay.classList.remove("visible");
    } else if (t < endingStart) {
      // 정적 구간: 아무도 활성화하지 않고, 자막도 지운다
      setActiveCard(null, false);
      updateSubtitle(null);
      endingOverlay.classList.remove("visible");
    } else {
      setActiveCard(null, false);
      updateSubtitle(null);
      endingOverlay.classList.add("visible");
    }

    timeReadout.textContent = `${t.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;
  }

  // ── 재생 루프 (자동 재생, 종료 후 반복) ─────────────────────────────
  let elapsed = 0;
  let lastTs = null;
  let playing = true;

  function frame(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    if (playing) {
      elapsed += dt;
      if (elapsed >= totalDuration) elapsed -= totalDuration;
    }

    render(elapsed);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  btnPause.addEventListener("click", () => {
    playing = !playing;
    btnPause.textContent = playing ? "⏸ 일시정지" : "▶ 재생";
  });

  btnRestart.addEventListener("click", () => {
    elapsed = 0;
    activeSegKey = null; // 강제로 자막/오디오 재트리거
  });

  // ── 1080x1920 스테이지를 브라우저 창 크기에 맞춰 스케일링 ────────────
  function fitStage() {
    const controlsEl = document.querySelector(".controls");
    const controlsH = controlsEl ? controlsEl.offsetHeight : 0;
    const availW = window.innerWidth - 32;
    const availH = window.innerHeight - controlsH - 64;
    const scale = Math.min(availW / 1080, availH / 1920, 1);

    stage.style.transform = `scale(${scale})`;
    stageWrapper.style.width = `${1080 * scale}px`;
    stageWrapper.style.height = `${1920 * scale}px`;
  }
  window.addEventListener("resize", fitStage);
  fitStage();
})();
