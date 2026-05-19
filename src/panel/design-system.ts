/** BotManager — tema escuro estilo Telegram */
export const designSystem = {
  colors: {
    bgBase: "#0e1621",
    bgSidebar: "#17212b",
    bgCard: "#1c2733",
    bgCardHover: "#243040",
    border: "rgba(255,255,255,0.08)",
    primary: "#2aabee",
    primaryHover: "#229ed9",
    primaryDim: "rgba(42, 171, 238, 0.15)",
    primaryGlow: "rgba(42, 171, 238, 0.35)",
    accentBlue: "#64b5ef",
    accentGreen: "#4dcd5e",
    accentOrange: "#e8a838",
    text: "#f5f7fa",
    textSecondary: "#8b9bab",
    muted: "#6d7f8f",
    success: "#4dcd5e",
    successBg: "rgba(77, 205, 94, 0.12)",
    danger: "#e85c4a",
    warning: "#e8a838",
    warningBg: "rgba(232, 168, 56, 0.12)"
  },
  fonts: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
  },
  motion: "200ms cubic-bezier(0.4, 0, 0.2, 1)"
} as const;
