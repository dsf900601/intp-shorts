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
  } = TEMPLATE;

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
  let activeSegKey = null;

  // 활성화되는 동안만 잠깐 다른 이미지(예: 엄지의 놀란 표정)로 바꿔 보여주고,
  // 비활성화되면 즉시 기본 이미지로 되돌린다. 짧은 fade로만 전환하며,
  // reactionAvatarSrc가 없는 참가자에게는 아무 영향이 없다.
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

  function setActiveCard(id) {
    if (id === activeId) return;

    if (activeId && cardEls[activeId]) {
      cardEls[activeId].classList.remove("active");
      const prevP = participantById[activeId];
      if (prevP && prevP.reactionAvatarSrc) crossfadeAvatar(activeId, prevP.avatarSrc);
    }

    activeId = id;

    if (id && cardEls[id]) {
      cardEls[id].classList.add("active");
      const p = participantById[id];
      if (p && p.reactionAvatarSrc) crossfadeAvatar(id, p.reactionAvatarSrc);
    }
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
    subtitleText.textContent = seg.text;
    subtitleArea.dataset.type = seg.type === "reaction" ? "reaction" : "normal";
    subtitleArea.classList.add("visible");

    playSegmentAudio(seg);
  }

  function render(t) {
    meetingClockEl.textContent = formatClock(clockBaseSeconds + t);

    if (t < talkEnd) {
      const seg = findSegment(t);
      setActiveCard(seg ? seg.speakerId : null);
      updateSubtitle(seg);
      endingOverlay.classList.remove("visible");
    } else if (t < endingStart) {
      // 정적 구간: 아무도 활성화하지 않고, 자막도 지운다
      setActiveCard(null);
      updateSubtitle(null);
      endingOverlay.classList.remove("visible");
    } else {
      setActiveCard(null);
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
