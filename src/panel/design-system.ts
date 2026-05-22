/** BotManager — Neon Pulse (inspirado em painéis de ads/bots) */
export const designSystem = {
  colors: {
    bgBase: "#000000",
    bgElevated: "#08080c",
    bgSidebar: "rgba(4, 4, 8, 0.94)",
    bgCard: "rgba(12, 12, 18, 0.85)",
    bgCardSolid: "rgba(8, 8, 12, 0.98)",
    bgCardHover: "rgba(20, 20, 28, 0.9)",
    border: "rgba(255, 255, 255, 0.07)",
    borderHighlight: "rgba(255, 45, 85, 0.35)",
    primary: "#ff2d55",
    primaryHover: "#ff4d6d",
    primaryDim: "rgba(255, 45, 85, 0.12)",
    primaryGlow: "rgba(255, 45, 85, 0.5)",
    accentCyan: "#00d4ff",
    accentCyanDim: "rgba(0, 212, 255, 0.1)",
    accentViolet: "#a855f7",
    accentVioletDim: "rgba(168, 85, 247, 0.12)",
    accentRose: "#ff2d55",
    accentRoseDim: "rgba(255, 45, 85, 0.12)",
    accentMint: "#22d3a5",
    accentMintDim: "rgba(34, 211, 165, 0.12)",
    text: "#f5f5f7",
    textSecondary: "#9ca3af",
    muted: "#6b7280",
    success: "#22d3a5",
    successBg: "rgba(34, 211, 165, 0.12)",
    danger: "#ff4466",
    warning: "#fbbf24",
    warningBg: "rgba(251, 191, 36, 0.12)"
  },
  glass: {
    blur: "20px",
    saturate: "1.15",
    shadow:
      "0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 0 0 1px rgba(255, 45, 85, 0.08), 0 24px 64px rgba(0, 0, 0, 0.65)"
  },
  fonts: {
    display: "'Outfit', system-ui, sans-serif",
    sans: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
  },
  motion: "280ms cubic-bezier(0.22, 1, 0.36, 1)"
} as const;
