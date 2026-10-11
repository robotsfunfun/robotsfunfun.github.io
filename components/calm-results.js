import { html } from "lit";
import { LightElement } from "./light-element.js";
import "./calm-robot.js";
import { CONFIG, tierMessage } from "../game-rules.js";

class CalmResults extends LightElement {
  static get properties() {
    return {
      score: { type: Number },
      pressedKey: { type: String },
      focusToken: { type: Number }
    };
  }

  constructor() {
    super();
    this.score = 0;
    this.pressedKey = "";
    this.focusToken = 0;
  }

  updated(changed) {
    if (changed.has("focusToken") && this.focusToken > 0) {
      var card = this.querySelector(".results-card");
      if (card) card.focus();
    }
  }

  render() {
    var replayClass = this.pressedKey === "replay" ? "start-btn is-pressed" : "start-btn";
    var homeClass = this.pressedKey === "home" ? "ghost-btn is-pressed" : "ghost-btn";
    return html`
      <div class="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title" tabindex="-1">
        <calm-robot class="results-robot" variant="results" aria-hidden="true"></calm-robot>
        <h2 id="results-title">練習完成</h2>
        <p class="score-line"><span id="final-score">${this.score}</span><span class="score-unit">分</span></p>
        <p class="score-max">滿分 <span data-max>${CONFIG.MAX_SCORE}</span> 分</p>
        <p id="tier-text" class="tier-text">${tierMessage(this.score)}</p>
        <div class="results-actions">
          <button type="button" class=${replayClass} data-action="replay">再玩一次</button>
          <button type="button" class=${homeClass} data-action="home">回首頁</button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("calm-results")) {
  customElements.define("calm-results", CalmResults);
}
