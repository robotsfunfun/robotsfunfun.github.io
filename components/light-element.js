import { LitElement } from "lit";

export class LightElement extends LitElement {
  createRenderRoot() {
    return this;
  }
}
