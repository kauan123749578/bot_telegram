import { escapeHtml } from "./layout.js";

export const BRAND_LOGO_SRC = "/brand/telegram-logo.png";

export function brandMarkHtml(subtitle = "BotManager") {
  return `<div class="brand-mark">
    <img class="brand-logo" src="${BRAND_LOGO_SRC}" alt="Telegram" width="40" height="40" />
    <div class="brand-copy">
      <span class="brand-title"><span class="brand-accent">Bot</span>Manager</span>
      ${subtitle ? `<span class="brand-sub">${escapeHtml(subtitle)}</span>` : ""}
    </div>
  </div>`;
}
