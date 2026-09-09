/*
  intp-shorts 공용 재생 엔진
  timeline.json(cue 배열)을 받아 "시간 t -> 화면 상태"를 순수 함수처럼
  계산해서 그린다. capture.mjs가 0초부터 total까지 1/30초 간격으로
  renderAtTime(t)를 호출해 프레임을 찍기 때문에, requestAnimationFrame이나
  CSS transition 타이밍에 의존하지 않고 항상 같은 t에 항상 같은 화면이
  나오도록 만드는 것이 핵심이다.
*/
(function (global) {
  const REVEAL_DUR = 0.32; // tokens.css --dur-reveal(320ms)와 동일
  const ANCHOR_RATIO = 0.60; // 새로 등장한 블록의 아래쪽을 스테이지 60% 지점에 고정

  function computeCueTimings(cues) {
    let t = 0;
    return cues.map((cue) => {
      const start = t;
      const end = t + cue.duration;
      t = end;
      return Object.assign({}, cue, { start, end });
    });
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildCue(cue) {
    const wrap = el("div", "block");

    switch (cue.type) {
      case "hook": {
        wrap.classList.add("hook");
        cue.lines.forEach((line) => wrap.appendChild(el("div", "line", line)));
        break;
      }
      case "titleCard": {
        // 재사용 가능하도록 남겨두는 기존 포맷(제목/메타 카드).
        // 이번 숏폼04는 "인트로 금지" 요구사항 때문에 사용하지 않는다.
        wrap.classList.add("title-card");
        wrap.appendChild(el("div", "headline", cue.headline));
        const meta = el("div", "meta");
        meta.innerHTML = `<span>${cue.author || "○○"}</span>·<span>방금 전</span>·<span>조회 ${cue.views || 0}</span>`;
        wrap.appendChild(meta);
        wrap.appendChild(el("hr", "divider"));
        break;
      }
      case "para": {
        wrap.classList.add("para");
        cue.lines.forEach((line) => wrap.appendChild(el("p", null, line)));
        break;
      }
      case "quote": {
        wrap.appendChild(el("span", "quote", cue.text));
        break;
      }
      case "bold": {
        wrap.appendChild(el("span", "bold-emphasis", cue.text));
        break;
      }
      case "final": {
        const line = el("span", "final-line");
        if (cue.prefix) line.appendChild(document.createTextNode(cue.prefix));
        const kw = el("span", "keyword", cue.keyword);
        line.appendChild(kw);
        if (cue.suffix) line.appendChild(document.createTextNode(cue.suffix));
        wrap.appendChild(line);
        break;
      }
      case "comment": {
        wrap.classList.add("comment");
        const avatar = el("div", "avatar", "\u{1F4AC}");
        const body = el("div", "body");
        const row1 = el("div", "row1");
        row1.innerHTML = `<span class="author">${cue.author}</span><span class="like">\u{1F44D} ${cue.likes}</span>`;
        const text = el("div", "text", cue.text);
        body.appendChild(row1);
        body.appendChild(text);
        wrap.appendChild(avatar);
        wrap.appendChild(body);
        break;
      }
      default: {
        wrap.appendChild(el("p", null, cue.text || ""));
      }
    }
    return wrap;
  }

  function buildCommentsHead() {
    const head = el("div", "comments-head");
    head.innerHTML = `<span class="bubble-icon">\u{1F4AC}</span><span>댓글</span>`;
    return head;
  }

  class ShortPlayer {
    constructor({ stage, track, timeline, audio }) {
      this.stage = stage;
      this.track = track;
      this.audio = audio || null;
      this.cues = computeCueTimings(timeline.cues);
      this.total = this.cues.length ? this.cues[this.cues.length - 1].end : 0;
      this._raf = null;
      this._startedAt = null;
      this._driven = false; // true면 외부(capture.mjs)가 renderAtTime을 직접 호출
    }

    totalDuration() {
      return this.total;
    }

    renderAtTime(t) {
      this.track.innerHTML = "";
      let lastNode = null;
      let commentsHeadInserted = false;

      for (const cue of this.cues) {
        if (cue.start > t) break;

        if (cue.type === "comment" && !commentsHeadInserted) {
          this.track.appendChild(buildCommentsHead());
          commentsHeadInserted = true;
        }

        const node = buildCue(cue);
        const localT = t - cue.start;
        const p = Math.max(0, Math.min(1, localT / REVEAL_DUR));
        node.style.opacity = String(p);
        node.style.transform = `translateY(${18 * (1 - p)}px)`;

        this.track.appendChild(node);
        lastNode = node;
      }

      if (lastNode) {
        const stageH = this.stage.clientHeight;
        const bottom = lastNode.offsetTop + lastNode.offsetHeight;
        const anchorY = stageH * ANCHOR_RATIO;
        const translate = Math.max(0, bottom - anchorY);
        this.track.style.transform = `translateY(${-translate}px)`;
      } else {
        this.track.style.transform = "translateY(0)";
      }
    }

    /** capture.mjs 등 외부에서 프레임 단위로 seek할 때 사용 */
    seek(t) {
      this._driven = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      this.renderAtTime(Math.max(0, Math.min(this.total, t)));
    }

    /** 브라우저에서 직접 열어 미리보기할 때만 사용하는 자동 재생 루프 */
    play() {
      if (this._driven) return; // capture 모드에서는 자동재생 금지
      const useAudio = this.audio && !isNaN(this.audio.duration) && this.audio.duration > 0;
      if (useAudio) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
        const tick = () => {
          this.renderAtTime(this.audio.currentTime);
          if (!this.audio.paused && !this.audio.ended) {
            this._raf = requestAnimationFrame(tick);
          }
        };
        tick();
      } else {
        this._startedAt = performance.now();
        const tick = () => {
          const t = (performance.now() - this._startedAt) / 1000;
          this.renderAtTime(Math.min(t, this.total));
          if (t < this.total) this._raf = requestAnimationFrame(tick);
        };
        tick();
      }
    }
  }

  global.IntpShorts = { ShortPlayer, computeCueTimings };
})(window);
