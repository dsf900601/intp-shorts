/* =========================================================
   커뮤니티 숏츠 생성기 - 렌더링 엔진
   content.json의 타이밍 값을 읽어 절대 시간 t(ms) 기준으로
   화면 상태를 계산한다.

   - window.renderAtTime(t) : 임의의 시간으로 즉시 이동해 그린다.
     (Playwright 프레임 캡처가 이 함수를 직접 호출한다.)
   - capture 모드가 아니면 requestAnimationFrame으로 실시간 재생한다.
   ========================================================= */

(() => {
  const ENTER_MS = 260; // 등장 트랜지션 길이 (150~300ms 권장 범위)
  const EXIT_MS = 200;  // 퇴장 트랜지션 길이

  const params = new URLSearchParams(location.search);
  const isCaptureMode = params.get("capture") === "1";

  const el = {
    stage: document.getElementById("stage"),
    communityName: document.getElementById("communityName"),
    postedAt: document.getElementById("postedAt"),
    title: document.getElementById("title"),
    bodyArea: document.getElementById("bodyArea"),
    imageSlot: document.getElementById("imageSlot"),
    attachedImage: document.getElementById("attachedImage"),
    emphasisOverlay: document.getElementById("emphasisOverlay"),
    emphasisText: document.getElementById("emphasisText"),
    conclusionOverlay: document.getElementById("conclusionOverlay"),
    conclusionText: document.getElementById("conclusionText"),
    commentBar: document.getElementById("commentBar"),
    commentText: document.getElementById("commentText"),
  };

  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /**
   * 특정 구간 [start, end] 안에서 등장(enter) / 유지(hold) / 퇴장(exit) 진행률을 계산한다.
   * 반환되는 opacity, p(0~1)는 등장/퇴장 트랜지션에 그대로 사용할 수 있다.
   */
  function reveal(t, start, end, enterMs = ENTER_MS, exitMs = EXIT_MS) {
    if (start == null || end == null || end <= start) {
      return { visible: false, opacity: 0, p: 0, phase: "none" };
    }
    if (t < start || t > end) {
      return { visible: false, opacity: 0, p: 0, phase: t < start ? "before" : "after" };
    }
    const sinceStart = t - start;
    const untilEnd = end - t;

    if (sinceStart < enterMs) {
      const p = easeOut(sinceStart / enterMs);
      return { visible: true, opacity: p, p, phase: "enter" };
    }
    if (untilEnd < exitMs) {
      const p = easeOut(untilEnd / exitMs);
      return { visible: true, opacity: p, p, phase: "exit" };
    }
    return { visible: true, opacity: 1, p: 1, phase: "hold" };
  }

  let content = null;

  function buildStaticParts(data) {
    el.communityName.textContent = data.meta.community || "익명게시판";
    el.postedAt.textContent = data.meta.postedAt || "";
    el.title.textContent = data.title.text;

    // 본문 문단(문장) 블록 생성
    el.bodyArea.innerHTML = "";
    data.bodySections.forEach((group) => {
      const groupEl = document.createElement("div");
      groupEl.className = "body-group";
      groupEl.dataset.id = group.id;

      group.lines.forEach((line) => {
        const lineEl = document.createElement("p");
        lineEl.className = "body-line";
        lineEl.textContent = line.text;
        groupEl.appendChild(lineEl);
      });

      el.bodyArea.appendChild(groupEl);
    });

    // 강조 문장
    el.emphasisText.textContent = data.emphasis.text;

    // 결론 (강조 단어는 별도 span으로 감싼다)
    el.conclusionText.innerHTML = "";
    data.conclusion.lines.forEach((lineText) => {
      const p = document.createElement("p");
      p.style.margin = "0";
      if (data.conclusion.strongText && lineText.includes(data.conclusion.strongText)) {
        const [before, after] = lineText.split(data.conclusion.strongText);
        p.append(document.createTextNode(before));
        const strong = document.createElement("span");
        strong.className = "strong-word";
        strong.id = "strongWord";
        strong.textContent = data.conclusion.strongText;
        p.appendChild(strong);
        p.append(document.createTextNode(after));
      } else {
        p.textContent = lineText;
      }
      el.conclusionText.appendChild(p);
    });

    // 마지막 댓글
    el.commentText.textContent = data.comment.text;

    // 첨부 이미지
    if (data.image && data.image.src) {
      el.attachedImage.src = data.image.src;
      el.attachedImage.alt = data.image.caption || "첨부 이미지";
      el.imageSlot.classList.add("has-image");
    } else {
      el.imageSlot.classList.remove("has-image");
    }
  }

  /** 임의의 시간 t(ms)로 화면을 그린다. Playwright 캡처가 프레임마다 호출한다. */
  function renderAtTime(t) {
    if (!content) return;

    // 제목
    {
      const r = reveal(t, content.title.startTime, content.title.endTime);
      el.title.style.opacity = r.opacity;
      el.title.style.transform = `translateY(${(1 - r.p) * 16}px)`;
    }

    // 본문 문단 + 문장 단위 강조
    const groupEls = el.bodyArea.querySelectorAll(".body-group");
    groupEls.forEach((groupEl) => {
      const group = content.bodySections.find((g) => g.id === groupEl.dataset.id);
      const r = reveal(t, group.startTime, group.endTime);
      groupEl.style.opacity = r.opacity;
      groupEl.style.transform = `translateY(calc(-50% + ${(1 - r.p) * 20}px))`;

      const lineEls = groupEl.querySelectorAll(".body-line");
      group.lines.forEach((line, i) => {
        const active = t >= line.startTime && t <= line.endTime;
        const lineEl = lineEls[i];
        lineEl.classList.toggle("is-active", active);
        lineEl.style.transform = active ? "scale(1.04)" : "scale(1)";
      });
    });

    // 첨부 이미지 영역 (없으면 항상 접힌 상태 유지)
    if (content.image && content.image.src) {
      const r = reveal(t, content.image.startTime, content.image.endTime);
      el.imageSlot.style.height = r.visible ? "560px" : "0px";
      el.imageSlot.style.opacity = r.opacity;
      el.imageSlot.style.transform = `translateY(${(1 - r.p) * 16}px) scale(${0.98 + r.p * 0.02})`;
    }

    // 강조 장면 (레이아웃을 깨고 화면 중앙에 크게)
    {
      const r = reveal(t, content.emphasis.startTime, content.emphasis.endTime);
      el.emphasisOverlay.style.opacity = r.opacity;
      el.emphasisText.style.transform = `scale(${0.86 + r.p * 0.14})`;
    }

    // 결론 장면
    {
      const r = reveal(t, content.conclusion.startTime, content.conclusion.endTime);
      el.conclusionOverlay.style.opacity = r.opacity;
      el.conclusionText.style.transform = `scale(${0.9 + r.p * 0.1})`;

      const strongWord = document.getElementById("strongWord");
      if (strongWord) {
        if (r.phase === "hold") {
          // 살짝 숨쉬는 듯한 pulse로 핵심 단어를 강조한다 (과하지 않게).
          const elapsed = t - content.conclusion.startTime;
          const pulse = 1 + Math.sin(elapsed / 480) * 0.045;
          strongWord.style.transform = `scale(${pulse})`;
        } else {
          strongWord.style.transform = "scale(1)";
        }
      }
    }

    // 마지막 댓글 (아래에서 슬라이드 업)
    {
      const r = reveal(t, content.comment.startTime, content.comment.endTime);
      el.commentBar.style.opacity = r.opacity;
      el.commentBar.style.transform = `translateY(${(1 - r.p) * 140}px)`;
    }
  }

  async function boot() {
    const res = await fetch("content.json", { cache: "no-store" });
    content = await res.json();

    buildStaticParts(content);
    renderAtTime(0);

    // Playwright 캡처가 시간을 직접 제어할 수 있도록 전역에 노출한다.
    window.renderAtTime = renderAtTime;
    window.__CONTENT__ = content;
    window.__ready = true;

    if (!isCaptureMode) {
      startRealtimePlayback();
    }
  }

  function startRealtimePlayback() {
    const duration = content.meta.durationMs;
    let startedAt = performance.now();

    function loop(now) {
      let elapsed = now - startedAt;
      if (elapsed > duration + 600) {
        // 미리보기 편의를 위해 반복 재생한다.
        startedAt = now;
        elapsed = 0;
      }
      renderAtTime(elapsed);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  // 브라우저 창 크기에 맞춰 1080x1920 스테이지를 축소 표시한다 (캡처 시에는 1080x1920
  // 뷰포트 그대로 사용되므로 scale이 1이 되어 실제 출력에는 영향을 주지 않는다).
  function fitStage() {
    const scale = Math.min(
      window.innerWidth / 1080,
      window.innerHeight / 1920
    );
    el.stage.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", fitStage);
  fitStage();

  boot();
})();
