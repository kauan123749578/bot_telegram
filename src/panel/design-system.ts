/** BotManager — Obsidian Studio: fundo quente, ouro, violeta, menta */
export const designSystem = {
  colors: {
    bgBase: "#0c0b10",
    bgElevated: "#14131a",
    bgSidebar: "rgba(18, 16, 26, 0.88)",
    bgCard: "rgba(22, 20, 30, 0.72)",
    bgCardSolid: "rgba(14, 13, 20, 0.98)",
    bgCardHover: "rgba(32, 28, 42, 0.85)",
    border: "rgba(255, 255, 255, 0.08)",
    borderHighlight: "rgba(255, 255, 255, 0.14)",
    primary: "#e8b84d",
    primaryHover: "#f5cc6a",
    primaryDim: "rgba(232, 184, 77, 0.14)",
    primaryGlow: "rgba(232, 184, 77, 0.35)",
    accentViolet: "#a78bfa",
    accentVioletDim: "rgba(167, 139, 250, 0.14)",
    accentRose: "#f472b6",
    accentRoseDim: "rgba(244, 114, 182, 0.12)",
    accentMint: "#5eead4",
    accentMintDim: "rgba(94, 234, 212, 0.12)",
    accentSky: "#67b8e3",
    accentSkyDim: "rgba(103, 184, 227, 0.12)",
    text: "#f4f2f8",
    textSecondary: "#b8b0c8",
    muted: "#7a728f",
    success: "#5eead4",
    successBg: "rgba(94, 234, 212, 0.12)",
    danger: "#fb7185",
    warning: "#fbbf24",
    warningBg: "rgba(251, 191, 36, 0.12)"
  },
  glass: {
    blur: "24px",
    saturate: "1.2",
    shadow:
      "0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 16px 48px rgba(0, 0, 0, 0.4)"
  },
  fonts: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    sans: "'DM Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace"
  },
  motion: "260ms cubic-bezier(0.22, 1, 0.36, 1)"
} as const;
