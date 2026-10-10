(function () {
  "use strict";

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

  var SHAPE_SVG = {
    circle:
      '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="76" fill="#3b82f6"/></svg>',
    square:
      '<svg viewBox="0 0 200 200" aria-hidden="true"><rect x="32" y="32" width="136" height="136" rx="16" fill="#f43f5e"/></svg>',
    triangle:
      '<svg viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,18 188,176 12,176" fill="#f43f5e" stroke="#f43f5e" stroke-linejoin="round" stroke-width="18"/></svg>',
    star:
      '<svg viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,18 122,74 182,74 134,110 152,168 100,132 48,168 66,110 18,74 78,74" fill="#f43f5e"/></svg>'
  };

  var welcomeEl = document.getElementById("welcome");
  var gameEl = document.getElementById("game");
  var resultsEl = document.getElementById("results");
  var resultsCard = resultsEl.querySelector(".results-card");
  var roundLabel = document.getElementById("round-label");
  var scoreLabel = document.getElementById("score-label");
  var finalScore = document.getElementById("final-score");
  var tierText = document.getElementById("tier-text");
  var badge = document.getElementById("badge");
  var fixation = document.getElementById("fixation");
  var stimulus = document.getElementById("stimulus");
  var muteBtn = document.getElementById("mute-btn");

  var state = {
    screen: "welcome",
    round: 0,
    score: 0,
    muted: false,
    phase: "idle",
    shape: null,
    responded: false,
    session: 0,
    history: []
  };

  var timers = [];
  var stimulusTimer = null;
  var audioCtx = null;
  var lastActionAt = Object.create(null);

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

  function later(fn, ms) {
    var id = setTimeout(function () {
      timers = timers.filter(function (item) { return item !== id; });
      fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (stimulusTimer) {
      clearTimeout(stimulusTimer);
      stimulusTimer = null;
    }
  }

  function updateHud() {
    roundLabel.textContent = String(state.round > 0 ? state.round : 1);
    scoreLabel.textContent = String(state.score);
  }

  function renderMute() {
    muteBtn.classList.toggle("is-muted", state.muted);
    var label = muteBtn.querySelector(".mute-label");
    if (label) label.textContent = state.muted ? "音效關" : "音效開";
    muteBtn.setAttribute("aria-pressed", state.muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", state.muted ? "音效關，點一下開啟" : "音效開，點一下關閉");
  }

  function unlockAudio() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    // iOS Safari only resumes audio inside the user gesture. Call resume()
    // synchronously here; pointerdown, touchstart, and touchend all count.
    try {
      var pending = audioCtx.resume();
      if (pending && pending.catch) pending.catch(function () {});
    } catch (err) {
      /* Some browsers throw if resume is called twice. */
    }
    if (audioCtx.state === "running") return;
    try {
      var t0 = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(440, t0);
      gain.gain.setValueAtTime(0.0008, t0);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.02);
    } catch (err) {
      /* Priming can fail if the context is closed; later cues still try. */
    }
  }

  function playTone(spec) {
    var t0 = audioCtx.currentTime + 0.01;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + spec.duration + 0.02);
  }

  function playCue(name) {
    if (state.muted || !audioCtx) return;
    var spec = AUDIO[name];
    if (!spec) return;
    try {
      var pending = audioCtx.resume();
      if (pending && pending.catch) pending.catch(function () {});
      playTone(spec);
    } catch (err) {
      /* Keep the round moving even if audio fails. */
    }
  }

  function allow(key) {
    var now = performance.now();
    var prev = lastActionAt[key] || 0;
    if (now - prev < CONFIG.DEBOUNCE_MS) return false;
    lastActionAt[key] = now;
    return true;
  }

  function showResults() {
    state.phase = "results";
    state.screen = "results";
    finalScore.textContent = String(state.score);
    tierText.textContent = tierMessage(state.score);
    resultsEl.hidden = false;
    resultsCard.focus();
  }

  function presentStimulus(session) {
    if (session !== state.session || state.phase !== "fixation") return;
    state.phase = "stimulus";
    state.responded = false;
    state.shape = takeShape();
    fixation.hidden = true;
    stimulus.hidden = false;
    stimulus.setAttribute("aria-label", SHAPE_LABEL[state.shape] || "圖形");
    stimulus.dataset.shape = state.shape;
    stimulus.innerHTML = SHAPE_SVG[state.shape] || "";
    stimulus.classList.remove("pop");
    void stimulus.offsetWidth;
    stimulus.classList.add("pop");
    stimulusTimer = setTimeout(function () {
      stimulusTimer = null;
      if (session !== state.session) return;
      resolveRound(false, session);
    }, CONFIG.DISPLAY_MS);
  }

  function beginRound(session) {
    if (session !== state.session) return;
    state.round += 1;
    state.phase = "fixation";
    state.responded = false;
    state.shape = null;
    updateHud();
    fixation.hidden = false;
    stimulus.hidden = true;
    stimulus.classList.remove("pop");
    stimulus.removeAttribute("data-shape");
    later(function () {
      presentStimulus(session);
    }, CONFIG.ISI_MS);
  }

  function resolveRound(tapped, session) {
    if (session !== state.session) return;
    if (state.phase !== "stimulus" || state.responded) return;
    state.responded = true;
    if (stimulusTimer) {
      clearTimeout(stimulusTimer);
      stimulusTimer = null;
    }
    var result = judge(state.shape, tapped);
    state.score += result.score;
    state.history.push({
      shape: state.shape,
      tapped: tapped,
      id: result.id,
      score: state.score,
      text: result.text
    });
    updateHud();
    playCue(result.cue);
    badge.textContent = result.text;
    badge.classList.toggle("is-good", result.good);
    badge.classList.toggle("is-oops", !result.good);
    badge.classList.add("show");
    state.phase = "feedback";
    var isLast = state.round >= CONFIG.TOTAL_ROUNDS;
    if (isLast) {
      later(function () {
        if (session !== state.session) return;
        showResults();
      }, CONFIG.RESULTS_DELAY_MS);
    }
    later(function () {
      if (session !== state.session) return;
      badge.classList.remove("show");
      if (!isLast) beginRound(session);
    }, CONFIG.FEEDBACK_MS);
  }

  function startGame() {
    clearTimers();
    state.session += 1;
    var session = state.session;
    state.score = 0;
    state.round = 0;
    state.shape = null;
    state.responded = false;
    state.history = [];
    state.phase = "idle";
    state.screen = "game";
    welcomeEl.hidden = true;
    gameEl.hidden = false;
    resultsEl.hidden = true;
    badge.classList.remove("show");
    badge.textContent = "";
    updateHud();
    beginRound(session);
  }

  function goHome() {
    clearTimers();
    state.session += 1;
    state.phase = "idle";
    state.screen = "welcome";
    state.shape = null;
    resultsEl.hidden = true;
    gameEl.hidden = true;
    welcomeEl.hidden = false;
    badge.classList.remove("show");
    fixation.hidden = true;
    stimulus.hidden = true;
  }

  function toggleMute() {
    state.muted = !state.muted;
    renderMute();
    if (!state.muted) playCue("hit");
  }

  function onPointerDown(event) {
    unlockAudio();
    if (event.cancelable) event.preventDefault();
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    button.classList.add("is-pressed");
    if (action === "respond") {
      if (state.phase !== "stimulus" || state.responded) return;
      if (!allow("respond")) return;
      resolveRound(true, state.session);
      return;
    }
    if (!allow(action)) return;
    if (action === "start" || action === "replay") startGame();
    else if (action === "home") goHome();
    else if (action === "mute") toggleMute();
  }

  function clearPressed() {
    var pressed = document.querySelectorAll(".is-pressed");
    for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove("is-pressed");
  }

  document.querySelectorAll("[data-total]").forEach(function (el) {
    el.textContent = String(CONFIG.TOTAL_ROUNDS);
  });
  document.querySelectorAll("[data-max]").forEach(function (el) {
    el.textContent = String(CONFIG.MAX_SCORE);
  });

  state.muted = false;
  try {
    localStorage.removeItem("calm-energy-muted");
  } catch (err) {
    /* Ignore private-mode storage failures. */
  }
  renderMute();

  var gestureUnlock = { capture: true, passive: true };
  document.addEventListener("pointerdown", unlockAudio, gestureUnlock);
  document.addEventListener("touchstart", unlockAudio, gestureUnlock);
  document.addEventListener("touchend", unlockAudio, gestureUnlock);

  var pointerEvent = window.PointerEvent ? "pointerdown" : "touchstart";
  document.addEventListener(pointerEvent, onPointerDown, { passive: false });
  document.addEventListener("pointerup", clearPressed);
  document.addEventListener("pointercancel", clearPressed);
  document.addEventListener("touchend", clearPressed);
  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(function () {});
    });
  }

  window.__calm = {
    CONFIG: CONFIG,
    AUDIO: AUDIO,
    judge: judge,
    tierMessage: tierMessage,
    pickShape: pickShape,
    queue: [],
    getState: function () {
      return {
        screen: state.screen,
        round: state.round,
        score: state.score,
        phase: state.phase,
        shape: state.shape,
        muted: state.muted,
        audioState: audioCtx ? audioCtx.state : "none",
        history: state.history.slice()
      };
    }
  };
})();
