import { html } from "lit";
import { LightElement } from "./light-element.js";
import "./calm-robot.js";

class CalmWelcome extends LightElement {
  static get properties() {
    return {
      pressed: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.pressed = false;
  }

  render() {
    return html`
      <calm-robot class="robot-wrap" variant="welcome" aria-hidden="true"></calm-robot>
      <div class="rules">
        <article class="rule-card rule-go">看到「圓形」👉 輕點圖案或下方按鈕 (得20分)。</article>
        <article class="rule-card rule-nogo">看到「其他圖形」👉 手放開！忍住不按 (得20分)。</article>
      </div>
      <button type="button" class=${this.pressed ? "start-btn is-pressed" : "start-btn"} data-action="start">開始</button>
    `;
  }
}

if (!customElements.get("calm-welcome")) {
  customElements.define("calm-welcome", CalmWelcome);
}
