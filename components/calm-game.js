import { html, nothing } from "lit";
import { LightElement } from "./light-element.js";
import { shapeGraphic } from "./graphics.js";
import { CONFIG, SHAPE_LABEL } from "../game-rules.js";

class CalmGame extends LightElement {
  static get properties() {
    return {
      round: { type: Number },
      score: { type: Number },
      shape: { attribute: false },
      stimulusHidden: { type: Boolean },
      fixationHidden: { type: Boolean },
      popOn: { type: Boolean },
      popToken: { type: Number },
      badgeText: { type: String },
      badgeShow: { type: Boolean },
      badgeTone: { type: String },
      pressedKey: { type: String }
    };
  }

  constructor() {
    super();
    this.round = 0;
    this.score = 0;
    this.shape = null;
    this.stimulusHidden = true;
    this.fixationHidden = false;
    this.popOn = false;
    this.popToken = 0;
    this.badgeText = "";
    this.badgeShow = false;
    this.badgeTone = "";
    this.pressedKey = "";
  }

  updated(changed) {
    if (changed.has("popToken") && this.popToken > 0) {
      var stimulus = this.querySelector("#stimulus");
      if (stimulus) {
        stimulus.classList.remove("pop");
        void stimulus.offsetWidth;
        stimulus.classList.add("pop");
      }
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
    var shapeClass = this.popOn ? "shape-btn pop" : "shape-btn";
    if (this.pressedKey === "stimulus") shapeClass += " is-pressed";
    var cushionClass = this.pressedKey === "cushion" ? "cushion is-pressed" : "cushion";
    return html`
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
          class=${shapeClass}
          data-action="respond"
          ?hidden=${this.stimulusHidden}
          data-shape=${this.shape || nothing}
          aria-label=${this.shape ? (SHAPE_LABEL[this.shape] || "圖形") : "圖形"}
        >${shapeGraphic(this.shape)}</button>
      </div>
      <button type="button" id="cushion" class=${cushionClass} data-action="respond">輕點這裡 (圓形專用)</button>
    `;
  }
}

if (!customElements.get("calm-game")) {
  customElements.define("calm-game", CalmGame);
}
