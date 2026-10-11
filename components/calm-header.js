import { html } from "lit";
import { LightElement } from "./light-element.js";

class CalmHeader extends LightElement {
  static get properties() {
    return {
      muted: { type: Boolean },
      pressed: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.muted = false;
    this.pressed = false;
  }

  render() {
    var label = this.muted ? "音效關" : "音效開";
    var aria = this.muted ? "音效關，點一下開啟" : "音效開，點一下關閉";
    var muteClass = this.muted ? "mute-btn is-muted" : "mute-btn";
    if (this.pressed) muteClass += " is-pressed";
    return html`
      <h1>心平靜氣：小機械人能量控制遊戲</h1>
      <button
        type="button"
        id="mute-btn"
        class=${muteClass}
        data-action="mute"
        aria-pressed=${this.muted ? "true" : "false"}
        aria-label=${aria}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path fill="currentColor" d="M5 13h5.4L17 7.2v17.6L10.4 19H5z"></path>
          <path class="speaker-waves" d="M21 12.2a5 5 0 0 1 0 7.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
          <path class="speaker-waves" d="M24.2 9.4a9 9 0 0 1 0 13.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
          <path class="speaker-slash" d="M20.5 11.5l8.5 9M29 11.5l-8.5 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"></path>
        </svg>
        <span class="mute-label">${label}</span>
      </button>
    `;
  }
}

if (!customElements.get("calm-header")) {
  customElements.define("calm-header", CalmHeader);
}
