import { html } from "lit";
import { LightElement } from "./components/light-element.js";
import "./components/calm-header.js";
import "./components/calm-welcome.js";
import "./components/calm-game.js";
import "./components/calm-results.js";
import { CONFIG, AUDIO, judge, tierMessage, pickShape } from "./game-rules.js";

function takeShape() {
  var queue = window.__calm && window.__calm.queue;
  if (queue && queue.length) return queue.shift();
  return pickShape();
}

class CalmEnergyApp extends LightElement {
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
      popToken: { state: true },
      badgeText: { state: true },
      badgeShow: { state: true },
      badgeTone: { state: true },
      pressedKey: { state: true },
      focusToken: { state: true }
    };
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
    this.popToken = 0;
    this.badgeText = "";
    this.badgeShow = false;
    this.badgeTone = "";
    this.pressedKey = "";
    this.focusToken = 0;
    this.session = 0;
    this.responded = false;
    this.history = [];
    this.timers = [];
    this.stimulusTimer = null;
    this.audioCtx = null;
    this.lastActionAt = Object.create(null);
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
    this.focusToken += 1;
  }

  presentStimulus(session) {
    if (session !== this.session || this.phase !== "fixation") return;
    this.phase = "stimulus";
    this.responded = false;
    this.shape = takeShape();
    this.fixationHidden = true;
    this.stimulusHidden = false;
    this.popOn = true;
    this.popToken += 1;
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

  render() {
    return html`
      <div id="app">
        <calm-header class="header" .muted=${this.muted} .pressed=${this.pressedKey === "mute"}></calm-header>
        <main>
          <calm-welcome id="welcome" class="screen" ?hidden=${this.screen !== "welcome"} .pressed=${this.pressedKey === "start"}></calm-welcome>
          <calm-game
            id="game"
            class="screen"
            ?hidden=${this.screen === "welcome"}
            .round=${this.round}
            .score=${this.score}
            .shape=${this.shape}
            .stimulusHidden=${this.stimulusHidden}
            .fixationHidden=${this.fixationHidden}
            .popOn=${this.popOn}
            .popToken=${this.popToken}
            .badgeText=${this.badgeText}
            .badgeShow=${this.badgeShow}
            .badgeTone=${this.badgeTone}
            .pressedKey=${this.pressedKey}
          ></calm-game>
        </main>
      </div>
      <calm-results
        id="results"
        class="results"
        ?hidden=${this.screen !== "results"}
        .score=${this.score}
        .pressedKey=${this.pressedKey}
        .focusToken=${this.focusToken}
      ></calm-results>
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
