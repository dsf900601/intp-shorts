/* =========================================================================
 * script.js
 * -------------------------------------------------------------------------
 * content.js 의 데이터를 읽어 화면을 구성하고, 정해진 시각(time)에 맞춰
 * 문단/댓글을 순서대로 보여주며 자동으로 스크롤합니다.
 *
 * 이 파일은 새 숏츠를 만들 때 수정할 필요가 없습니다.
 * (내용을 바꾸고 싶다면 content.js 만 수정하세요)
 * ======================================================================= */

(function () {
  "use strict";

  const data = window.SHORTS_CONTENT;
  if (!data) {
    console.error("content.js 가 로드되지 않았습니다. index.html의 스크립트 순서를 확인하세요.");
    return;
  }

  const els = {
    stageLabel: document.getElementById("stage-label"),
    frame: document.getElementById("frame"),
    scroller: document.getElementById("scroller"),
    topbar: document.getElementById("post-topbar"),
    boardName: document.getElementById("board-name"),
    post: document.getElementById("post"),
    title: document.getElementById("post-title"),
    metaNick: document.getElementById("meta-nick"),
    metaTime: document.getElementById("meta-time"),
    metaViews: document.getElementById("meta-views"),
    body: document.getElementById("post-body"),
    commentsSection: document.getElementById("comments-section"),
    commentsList: document.getElementById("comments-list"),
    controls: document.getElementById("controls"),
    replayBtn: document.getElementById("replay-btn"),
    timer: document.getElementById("timer"),
  };

  // -----------------------------------------------------------------------
  // 1. 창 크기에 맞춰 1080x1920 프레임을 항상 화면 중앙에 표시
  //    (프레임 자체는 항상 정확히 1080x1920 픽셀이라 OBS 브라우저 소스 등에서
  //     그대로 캡처하면 별도 크롭 없이 딱 맞습니다)
  // -----------------------------------------------------------------------
  function fitStage() {
    const FRAME_W = 1080;
    const FRAME_H = 1920;
    const scale = Math.min(
      window.innerWidth / FRAME_W,
      window.innerHeight / FRAME_H
    );
    els.frame.style.transform = `scale(${scale})`;
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  // -----------------------------------------------------------------------
  // 2. 녹화용 클린 모드: URL에 ?clean=1 을 붙이면 편집용 UI를 숨김
  // -----------------------------------------------------------------------
  const params = new URLSearchParams(location.search);
  if (params.get("clean") === "1") {
    els.controls.style.display = "none";
    els.stageLabel.style.display = "none";
  }

  // -----------------------------------------------------------------------
  // 3. 유틸
  // -----------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 문단 텍스트를 HTML로 변환. \n -> <br>, strongWords -> <span class="strong-word">
  function renderParagraphHtml(paragraph) {
    let html = escapeHtml(paragraph.text).replace(/\n/g, "<br>");
    (paragraph.strongWords || []).forEach((word) => {
      const safeWord = escapeHtml(word);
      const re = new RegExp(escapeRegExp(safeWord), "g");
      html = html.replace(re, `<span class="strong-word">${safeWord}</span>`);
    });
    return html;
  }

  function reveal(el) {
    if (el) el.classList.add("visible");
  }

  function scrollToEl(el, block) {
    if (!el) return;
    // #scroller 내부에서만 스크롤되도록 함 (프레임 밖으로는 스크롤되지 않음)
    el.scrollIntoView({ behavior: "smooth", block: block || "end" });
  }

  // -----------------------------------------------------------------------
  // 4. 정적 텍스트(상단바 / 제목 / 메타 정보) 채우기
  // -----------------------------------------------------------------------
  const meta = data.meta || {};
  els.boardName.textContent = meta.board || "커뮤니티";
  els.title.textContent = data.title.text;
  els.metaNick.textContent = meta.nickname || "ㅇㅇ";
  els.metaTime.textContent = meta.time || "방금 전";
  els.metaViews.textContent = meta.views || "";

  // -----------------------------------------------------------------------
  // 5. 본문 문단 DOM 생성 (처음엔 숨김 상태 -> 타임라인에 따라 순서대로 공개)
  // -----------------------------------------------------------------------
  data.paragraphs.forEach((paragraph) => {
    const div = document.createElement("div");
    div.className = `paragraph ${paragraph.emphasis || "normal"}`;
    div.dataset.time = paragraph.time;
    div.innerHTML = renderParagraphHtml(paragraph);
    els.body.appendChild(div);
  });

  // -----------------------------------------------------------------------
  // 6. 댓글 DOM 생성 (처음엔 숨김 상태)
  // -----------------------------------------------------------------------
  data.comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = "comment";
    item.dataset.time = comment.time;
    item.innerHTML = `
      <div class="comment-avatar">💬</div>
      <div class="comment-body">
        <div class="comment-top">
          <span class="comment-nick">${escapeHtml(comment.nickname || "ㅇㅇ")}</span>
          ${
            comment.likes != null
              ? `<span class="comment-likes">👍 ${escapeHtml(comment.likes)}</span>`
              : ""
          }
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `;
    els.commentsList.appendChild(item);
  });

  // -----------------------------------------------------------------------
  // 7. 타임라인 구성: content.js의 time 값에 맞춰 setTimeout 예약
  // -----------------------------------------------------------------------
  const timers = [];
  function schedule(seconds, action) {
    timers.push(setTimeout(action, Math.max(0, seconds) * 1000));
  }

  // 상단바는 살짝 먼저 등장
  schedule(0, () => reveal(els.topbar));

  // 게시글(제목/메타)은 title.time 에 등장
  schedule(data.title.time || 0, () => reveal(els.post));

  // 본문 문단들: 각자의 time 에 등장 + 그 위치로 스크롤
  document.querySelectorAll("#post-body .paragraph").forEach((el) => {
    const t = parseFloat(el.dataset.time);
    schedule(t, () => {
      reveal(el);
      scrollToEl(el, "end");
    });
  });

  // 댓글 섹션 진입: commentsSectionTime 에 헤더가 보이며 그쪽으로 스크롤
  schedule(data.commentsSectionTime, () => {
    reveal(els.commentsSection);
    scrollToEl(els.commentsSection, "start");
  });

  // 댓글들: 각자의 time 에 하나씩 등장 + 스크롤
  document.querySelectorAll("#comments-list .comment").forEach((el) => {
    const t = parseFloat(el.dataset.time);
    schedule(t, () => {
      reveal(el);
      scrollToEl(el, "end");
    });
  });

  // -----------------------------------------------------------------------
  // 8. 경과 시간 표시 (편집 중 확인용)
  // -----------------------------------------------------------------------
  const total = data.totalDuration || 30;
  const startedAt = performance.now();
  let rafId = null;

  function tick() {
    const elapsed = (performance.now() - startedAt) / 1000;
    if (els.timer) {
      els.timer.textContent = `${elapsed.toFixed(1)}s / ${total.toFixed(1)}s`;
    }
    if (elapsed < total + 1) {
      rafId = requestAnimationFrame(tick);
    }
  }
  tick();

  // -----------------------------------------------------------------------
  // 9. 다시 재생 버튼: 가장 확실한 방법은 새로고침 (모든 타이머/상태 초기화)
  // -----------------------------------------------------------------------
  if (els.replayBtn) {
    els.replayBtn.addEventListener("click", () => {
      timers.forEach(clearTimeout);
      if (rafId) cancelAnimationFrame(rafId);
      location.reload();
    });
  }
})();
