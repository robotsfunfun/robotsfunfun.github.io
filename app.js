import { LitElement, html, svg, nothing } from "lit";

var CONFIG = {
  TOTAL_ROUNDS: 10,
  GO_RATIO: 0.6,
  GO_SHAPE: "circle",
  NO_GO_SHAPES: ["square", "triangle", "star"],
  DISPLAY_MS: 1000,
  ISI_MS: 1000,
  FEEDBACK_MS: 600,
  RESULTS_DELAY_MS: 150,
  DEBOUNCE_MS: 300,
  HIT_POINTS: 20,
  REJECTION_POINTS: 20,
  MAX_SCORE: 200
};

var AUDIO = {
  hit: { freq: 600, type: "sine", duration: 0.1 },
  correctRejection: { freq: 700, type: "sine", duration: 0.1 },
  falseAlarm: { freq: 220, type: "triangle", duration: 0.15 },
  miss: { freq: 180, type: "sine", duration: 0.1 }
};

var SHAPE_LABEL = {
  circle: "圓形",
  square: "正方形",
  triangle: "三角形",
  star: "星形"
};

function shapeGraphic(shape) {
  switch (shape) {
    case "circle":
      return svg`<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="76" fill="#3b82f6"></circle></svg>`;
    case "square":
      return svg`<svg viewBox="0 0 200 200" aria-hidden="true"><rect x="32" y="32" width="136" height="136" rx="16" fill="#f43f5e"></rect></svg>`;
    case "triangle":
      return svg`<svg viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,18 188,176 12,176" fill="#f43f5e" stroke="#f43f5e" stroke-linejoin="round" stroke-width="18"></polygon></svg>`;
    case "star":
      return svg`<svg viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,18 122,74 182,74 134,110 152,168 100,132 48,168 66,110 18,74 78,74" fill="#f43f5e"></polygon></svg>`;
    default:
      return nothing;
  }
}

function judge(shape, tapped) {
  var isGo = shape === CONFIG.GO_SHAPE;
  if (isGo && tapped) {
    return {
      id: "hit",
      score: CONFIG.HIT_POINTS,
      text: "太棒了！+" + CONFIG.HIT_POINTS + "分",
      cue: "hit",
      good: true
    };
  }
  if (isGo && !tapped) {
    return { id: "miss", score: 0, text: "哎呀，漏掉了", cue: "miss", good: false };
  }
  if (!isGo && !tapped) {
    return {
      id: "correctRejection",
      score: CONFIG.REJECTION_POINTS,
      text: "忍得好！+" + CONFIG.REJECTION_POINTS + "分",
      cue: "correctRejection",
      good: true
    };
  }
  return { id: "falseAlarm", score: 0, text: "手放開，忍住喔！", cue: "falseAlarm", good: false };
}

function tierMessage(score) {
  if (score >= CONFIG.MAX_SCORE) {
    return "🌟 完美的能量控制！你按到了所有圓形，而且看到其他圖形時都成功忍住不按，太厲害了！";
  }
  if (score >= 120 && score <= 180) {
    return "⚡ 反應超快的小達人！你表現得很棒！下次遇到不是圓形的圖案時，記得給自己 1 秒鐘深呼吸，手放開，就能拿到更高分喔！";
  }
  return "🌱 正在成長的冷靜法寶！今天練習得很認真喔。多玩幾次，你會越來越進步的！";
}

function pickShape(random) {
  var roll = (random || Math.random)();
  if (roll < CONFIG.GO_RATIO) return CONFIG.GO_SHAPE;
  var nogoRoll = (random || Math.random)();
  var index = Math.floor(nogoRoll * CONFIG.NO_GO_SHAPES.length);
  if (index >= CONFIG.NO_GO_SHAPES.length) index = CONFIG.NO_GO_SHAPES.length - 1;
  return CONFIG.NO_GO_SHAPES[index];
}

function takeShape() {
  var queue = window.__calm && window.__calm.queue;
  if (queue && queue.length) return queue.shift();
  return pickShape();
}

class CalmEnergyApp extends LitElement {
  static get properties() {
    return {
      screen: { state: true },
      round: { state: true },
      score: { state: true },
      muted: { state: true },
      phase: { state: true },
      shape: { state: true },
      stimulusHidden: { state: true },
      fixationHidden: { state: true },
      popOn: { state: true },
      badgeText: { state: true },
      badgeShow: { state: true },
      badgeTone: { state: true }
    };
  }

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.screen = "welcome";
    this.round = 0;
    this.score = 0;
    this.muted = false;
    this.phase = "idle";
    this.shape = null;
    this.stimulusHidden = true;
    this.fixationHidden = false;
    this.popOn = false;
    this.badgeText = "";
    this.badgeShow = false;
    this.badgeTone = "";
    this.session = 0;
    this.responded = false;
    this.history = [];
    this.timers = [];
    this.stimulusTimer = null;
    this.audioCtx = null;
    this.lastActionAt = Object.create(null);
    this.pressedKey = "";
    this._pendingPop = false;
    this._focusResults = false;
  }

  connectedCallback() {
    super.connectedCallback();
    wireDocumentEvents(this);
  }

  getState() {
    return {
      screen: this.screen,
      round: this.round,
      score: this.score,
      phase: this.phase,
      shape: this.shape,
      muted: this.muted,
      audioState: this.audioCtx ? this.audioCtx.state : "none",
      history: this.history.slice()
    };
  }

  later(fn, ms) {
    var self = this;
    var id = setTimeout(function () {
      self.timers = self.timers.filter(function (item) { return item !== id; });
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.stimulusTimer) {
      clearTimeout(this.stimulusTimer);
      this.stimulusTimer = null;
    }
  }

  unlockAudio() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.audioCtx) this.audioCtx = new AudioCtx();
    // iOS Safari only resumes audio inside the user gesture. Call resume()
    // synchronously here; pointerdown, touchstart, and touchend all count.
    try {
      var pending = this.audioCtx.resume();
      if (pending && pending.catch) pending.catch(function () {});
    } catch (err) {
      /* Some browsers throw if resume is called twice. */
    }
    if (this.audioCtx.state === "running") return;
    try {
      var t0 = this.audioCtx.currentTime;
      var osc = this.audioCtx.createOscillator();
      var gain = this.audioCtx.createGain();
      osc.frequency.setValueAtTime(440, t0);
      gain.gain.setValueAtTime(0.0008, t0);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.02);
    } catch (err) {
      /* Priming can fail if the context is closed; later cues still try. */
    }
  }

  playTone(spec) {
    var t0 = this.audioCtx.currentTime + 0.01;
    var osc = this.audioCtx.createOscillator();
    var gain = this.audioCtx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + spec.duration + 0.02);
  }

  playCue(name) {
    if (this.muted || !this.audioCtx) return;
    var spec = AUDIO[name];
    if (!spec) return;
    try {
      var pending = this.audioCtx.resume();
      if (pending && pending.catch) pending.catch(function () {});
      this.playTone(spec);
    } catch (err) {
      /* Keep the round moving even if audio fails. */
    }
  }

  allow(key) {
    var now = performance.now();
    var prev = this.lastActionAt[key] || 0;
    if (now - prev < CONFIG.DEBOUNCE_MS) return false;
    this.lastActionAt[key] = now;
    return true;
  }

  showResults() {
    this.phase = "results";
    this.screen = "results";
    this._focusResults = true;
  }

  presentStimulus(session) {
    if (session !== this.session || this.phase !== "fixation") return;
    this.phase = "stimulus";
    this.responded = false;
    this.shape = takeShape();
    this.fixationHidden = true;
    this.stimulusHidden = false;
    this.popOn = true;
    this._pendingPop = true;
    var self = this;
    this.stimulusTimer = setTimeout(function () {
      self.stimulusTimer = null;
      if (session !== self.session) return;
      self.resolveRound(false, session);
    }, CONFIG.DISPLAY_MS);
  }

  beginRound(session) {
    if (session !== this.session) return;
    this.round += 1;
    this.phase = "fixation";
    this.responded = false;
    this.shape = null;
    this.fixationHidden = false;
    this.stimulusHidden = true;
    this.popOn = false;
    var self = this;
    this.later(function () {
      self.presentStimulus(session);
    }, CONFIG.ISI_MS);
  }

  resolveRound(tapped, session) {
    if (session !== this.session) return;
    if (this.phase !== "stimulus" || this.responded) return;
    this.responded = true;
    if (this.stimulusTimer) {
      clearTimeout(this.stimulusTimer);
      this.stimulusTimer = null;
    }
    var result = judge(this.shape, tapped);
    this.score += result.score;
    this.history.push({
      shape: this.shape,
      tapped: tapped,
      id: result.id,
      score: this.score,
      text: result.text
    });
    this.playCue(result.cue);
    this.badgeText = result.text;
    this.badgeTone = result.good ? "good" : "oops";
    this.badgeShow = true;
    this.phase = "feedback";
    var isLast = this.round >= CONFIG.TOTAL_ROUNDS;
    var self = this;
    if (isLast) {
      this.later(function () {
        if (session !== self.session) return;
        self.showResults();
      }, CONFIG.RESULTS_DELAY_MS);
    }
    this.later(function () {
      if (session !== self.session) return;
      self.badgeShow = false;
      if (!isLast) self.beginRound(session);
    }, CONFIG.FEEDBACK_MS);
  }

  startGame() {
    this.clearTimers();
    this.session += 1;
    var session = this.session;
    this.score = 0;
    this.round = 0;
    this.shape = null;
    this.responded = false;
    this.history = [];
    this.phase = "idle";
    this.screen = "game";
    this.badgeShow = false;
    this.badgeText = "";
    this.stimulusHidden = true;
    this.popOn = false;
    this.beginRound(session);
  }

  goHome() {
    this.clearTimers();
    this.session += 1;
    this.phase = "idle";
    this.screen = "welcome";
    this.shape = null;
    this.badgeShow = false;
    this.fixationHidden = true;
    this.stimulusHidden = true;
    this.popOn = false;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) this.playCue("hit");
  }

  onPointerDown(event) {
    this.unlockAudio();
    if (event.cancelable) event.preventDefault();
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    this.pressedKey = action === "respond" ? button.id : action;
    button.classList.add("is-pressed");
    if (action === "respond") {
      if (this.phase !== "stimulus" || this.responded) return;
      if (!this.allow("respond")) return;
      this.resolveRound(true, this.session);
      return;
    }
    if (!this.allow(action)) return;
    if (action === "start" || action === "replay") this.startGame();
    else if (action === "home") this.goHome();
    else if (action === "mute") this.toggleMute();
  }

  clearPressed() {
    this.pressedKey = "";
    var pressed = document.querySelectorAll(".is-pressed");
    for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove("is-pressed");
  }

  updated() {
    if (this.pressedKey) {
      var pressedButton = this.pressedKey === "stimulus" || this.pressedKey === "cushion"
        ? this.querySelector("#" + this.pressedKey)
        : this.querySelector('[data-action="' + this.pressedKey + '"]');
      if (pressedButton) pressedButton.classList.add("is-pressed");
    }
    if (this._pendingPop) {
      this._pendingPop = false;
      var stimulus = this.querySelector("#stimulus");
      if (stimulus) {
        stimulus.classList.remove("pop");
        void stimulus.offsetWidth;
        stimulus.classList.add("pop");
      }
    }
    if (this._focusResults) {
      this._focusResults = false;
      var card = this.querySelector(".results-card");
      if (card) card.focus();
    }
  }

  badgeClass() {
    var names = ["badge"];
    if (this.badgeShow) names.push("show");
    if (this.badgeTone === "good") names.push("is-good");
    if (this.badgeTone === "oops") names.push("is-oops");
    return names.join(" ");
  }

  render() {
    var roundLabel = this.round > 0 ? this.round : 1;
    var muteLabel = this.muted ? "音效關" : "音效開";
    var muteAria = this.muted ? "音效關，點一下開啟" : "音效開，點一下關閉";
    return html`
      <div id="app">
        <header class="header">
          <h1>心平靜氣：小機械人能量控制遊戲</h1>
          <button
            type="button"
            id="mute-btn"
            class=${this.muted ? "mute-btn is-muted" : "mute-btn"}
            data-action="mute"
            aria-pressed=${this.muted ? "true" : "false"}
            aria-label=${muteAria}
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path fill="currentColor" d="M5 13h5.4L17 7.2v17.6L10.4 19H5z"></path>
              <path class="speaker-waves" d="M21 12.2a5 5 0 0 1 0 7.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
              <path class="speaker-waves" d="M24.2 9.4a9 9 0 0 1 0 13.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
              <path class="speaker-slash" d="M20.5 11.5l8.5 9M29 11.5l-8.5 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"></path>
            </svg>
            <span class="mute-label">${muteLabel}</span>
          </button>
        </header>

        <main>
          <section id="welcome" class="screen" ?hidden=${this.screen !== "welcome"}>
            <div class="robot-wrap" aria-hidden="true">
              <svg class="robot" viewBox="0 0 160 160">
                <line x1="80" y1="28" x2="80" y2="44" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"></line>
                <circle cx="80" cy="22" r="8" fill="#10b981"></circle>
                <rect x="36" y="46" width="88" height="68" rx="26" fill="#ffffff"></rect>
                <circle cx="62" cy="76" r="7" fill="#3b82f6"></circle>
                <circle cx="98" cy="76" r="7" fill="#3b82f6"></circle>
                <path d="M62 92 Q80 104 98 92" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round"></path>
                <circle cx="50" cy="90" r="4" fill="#fecdd3"></circle>
                <circle cx="110" cy="90" r="4" fill="#fecdd3"></circle>
                <rect x="54" y="120" width="52" height="26" rx="13" fill="#dbeafe"></rect>
                <circle cx="72" cy="133" r="3.5" fill="#3b82f6"></circle>
                <circle cx="88" cy="133" r="3.5" fill="#10b981"></circle>
              </svg>
            </div>

            <div class="rules">
              <article class="rule-card rule-go">看到「圓形」👉 輕點圖案或下方按鈕 (得20分)。</article>
              <article class="rule-card rule-nogo">看到「其他圖形」👉 手放開！忍住不按 (得20分)。</article>
            </div>

            <button type="button" class="start-btn" data-action="start">開始</button>
          </section>

          <section id="game" class="screen" ?hidden=${this.screen === "welcome"}>
            <div class="status" aria-live="polite">
              <p class="stat"><span class="stat-k">回合</span> <strong id="round-label">${roundLabel}</strong> / <span data-total>${CONFIG.TOTAL_ROUNDS}</span></p>
              <p class="stat"><span class="stat-k">分數</span> <strong id="score-label">${this.score}</strong></p>
            </div>

            <div class="stage">
              <p id="badge" class=${this.badgeClass()} role="status">${this.badgeText}</p>
              <div id="fixation" class="fixation" aria-hidden="true" ?hidden=${this.fixationHidden}>+</div>
              <button
                type="button"
                id="stimulus"
                class=${this.popOn ? "shape-btn pop" : "shape-btn"}
                data-action="respond"
                ?hidden=${this.stimulusHidden}
                data-shape=${this.shape || nothing}
                aria-label=${this.shape ? (SHAPE_LABEL[this.shape] || "圖形") : "圖形"}
              >${shapeGraphic(this.shape)}</button>
            </div>

            <button type="button" id="cushion" class="cushion" data-action="respond">輕點這裡 (圓形專用)</button>
          </section>
        </main>
      </div>

      <div id="results" class="results" ?hidden=${this.screen !== "results"}>
        <div class="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title" tabindex="-1">
          <div class="results-robot" aria-hidden="true">
            <svg viewBox="0 0 160 160">
              <line x1="80" y1="28" x2="80" y2="44" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"></line>
              <circle cx="80" cy="22" r="8" fill="#10b981"></circle>
              <rect x="36" y="46" width="88" height="68" rx="26" fill="#ffffff"></rect>
              <circle cx="62" cy="76" r="7" fill="#3b82f6"></circle>
              <circle cx="98" cy="76" r="7" fill="#3b82f6"></circle>
              <path d="M62 92 Q80 104 98 92" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round"></path>
              <circle cx="50" cy="90" r="4" fill="#fecdd3"></circle>
              <circle cx="110" cy="90" r="4" fill="#fecdd3"></circle>
              <rect x="54" y="120" width="52" height="26" rx="13" fill="#dbeafe"></rect>
            </svg>
          </div>
          <h2 id="results-title">練習完成</h2>
          <p class="score-line"><span id="final-score">${this.score}</span><span class="score-unit">分</span></p>
          <p class="score-max">滿分 <span data-max>${CONFIG.MAX_SCORE}</span> 分</p>
          <p id="tier-text" class="tier-text">${tierMessage(this.score)}</p>
          <div class="results-actions">
            <button type="button" class="start-btn" data-action="replay">再玩一次</button>
            <button type="button" class="ghost-btn" data-action="home">回首頁</button>
          </div>
        </div>
      </div>

      <div class="rotate-hint" role="note">請把手機直著拿喔</div>
    `;
  }
}

var wiredApp = null;

function wireDocumentEvents(app) {
  if (wiredApp) return;
  wiredApp = app;
  app.muted = false;
  try {
    localStorage.removeItem("calm-energy-muted");
  } catch (err) {
    /* Ignore private-mode storage failures. */
  }

  var gestureUnlock = { capture: true, passive: true };
  document.addEventListener("pointerdown", function () { app.unlockAudio(); }, gestureUnlock);
  document.addEventListener("touchstart", function () { app.unlockAudio(); }, gestureUnlock);
  document.addEventListener("touchend", function () { app.unlockAudio(); }, gestureUnlock);

  var pointerEvent = window.PointerEvent ? "pointerdown" : "touchstart";
  document.addEventListener(pointerEvent, function (event) { app.onPointerDown(event); }, { passive: false });
  document.addEventListener("pointerup", function () { app.clearPressed(); });
  document.addEventListener("pointercancel", function () { app.clearPressed(); });
  document.addEventListener("touchend", function () { app.clearPressed(); });
  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(function () {});
    });
  }
}

if (!customElements.get("calm-energy-app")) {
  customElements.define("calm-energy-app", CalmEnergyApp);
}

window.__calm = {
  CONFIG: CONFIG,
  AUDIO: AUDIO,
  judge: judge,
  tierMessage: tierMessage,
  pickShape: pickShape,
  queue: [],
  getState: function () {
    var el = document.querySelector("calm-energy-app");
    if (!el || typeof el.getState !== "function") {
      return {
        screen: "welcome",
        round: 0,
        score: 0,
        phase: "idle",
        shape: null,
        muted: false,
        audioState: "none",
        history: []
      };
    }
    return el.getState();
  }
};
