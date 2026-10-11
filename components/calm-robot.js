import { LightElement } from "./light-element.js";
import { robotSvg } from "./graphics.js";

class CalmRobot extends LightElement {
  static get properties() {
    return {
      variant: { type: String }
    };
  }

  constructor() {
    super();
    this.variant = "welcome";
  }

  render() {
    return robotSvg(this.variant);
  }
}

if (!customElements.get("calm-robot")) {
  customElements.define("calm-robot", CalmRobot);
}
