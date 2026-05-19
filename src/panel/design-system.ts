/** BotManager — Liquid Glass (inspirado em vidro fosco / translúcido) + Telegram blue */
export const designSystem = {
  colors: {
    bgBase: "#0a1018",
    bgSidebar: "rgba(20, 30, 42, 0.55)",
    bgCard: "rgba(28, 40, 54, 0.42)",
    bgCardHover: "rgba(36, 52, 70, 0.55)",
    border: "rgba(255, 255, 255, 0.1)",
    borderHighlight: "rgba(255, 255, 255, 0.18)",
    primary: "#2aabee",
    primaryHover: "#229ed9",
    primaryDim: "rgba(42, 171, 238, 0.18)",
    primaryGlow: "rgba(42, 171, 238, 0.4)",
    accentBlue: "#64b5ef",
    accentGreen: "#4dcd5e",
    accentOrange: "#e8a838",
    text: "#f5f7fa",
    textSecondary: "#9fb0c0",
    muted: "#6d8499",
    success: "#4dcd5e",
    successBg: "rgba(77, 205, 94, 0.14)",
    danger: "#e85c4a",
    warning: "#e8a838",
    warningBg: "rgba(232, 168, 56, 0.14)"
  },
  glass: {
    blur: "24px",
    saturate: "1.25",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
  },
  fonts: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
  },
  motion: "220ms cubic-bezier(0.4, 0, 0.2, 1)"
} as const;
