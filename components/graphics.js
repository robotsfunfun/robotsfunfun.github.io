import { svg, nothing } from "lit";

export function shapeGraphic(shape) {
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

export function robotSvg(variant) {
  var welcome = variant === "welcome";
  return svg`<svg class=${welcome ? "robot" : nothing} viewBox="0 0 160 160">
    <line x1="80" y1="28" x2="80" y2="44" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"></line>
    <circle cx="80" cy="22" r="8" fill="#10b981"></circle>
    <rect x="36" y="46" width="88" height="68" rx="26" fill="#ffffff"></rect>
    <circle cx="62" cy="76" r="7" fill="#3b82f6"></circle>
    <circle cx="98" cy="76" r="7" fill="#3b82f6"></circle>
    <path d="M62 92 Q80 104 98 92" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round"></path>
    <circle cx="50" cy="90" r="4" fill="#fecdd3"></circle>
    <circle cx="110" cy="90" r="4" fill="#fecdd3"></circle>
    <rect x="54" y="120" width="52" height="26" rx="13" fill="#dbeafe"></rect>
    ${welcome
      ? svg`<circle cx="72" cy="133" r="3.5" fill="#3b82f6"></circle><circle cx="88" cy="133" r="3.5" fill="#10b981"></circle>`
      : nothing}
  </svg>`;
}
