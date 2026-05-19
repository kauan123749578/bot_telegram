/** BotManager — dark SaaS dashboard (purple accent) */
export const designSystem = {
  colors: {
    bgBase: "#0c0e14",
    bgSidebar: "#10121a",
    bgCard: "#161922",
    bgCardHover: "#1c2030",
    border: "rgba(255,255,255,0.06)",
    primary: "#8b5cf6",
    primaryHover: "#7c3aed",
    primaryDim: "rgba(139, 92, 246, 0.15)",
    primaryGlow: "rgba(139, 92, 246, 0.35)",
    accentBlue: "#3b82f6",
    accentGreen: "#22c55e",
    accentOrange: "#f97316",
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    muted: "#64748b",
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.12)",
    danger: "#ef4444",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.12)"
  },
  fonts: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
  },
  motion: "200ms cubic-bezier(0.4, 0, 0.2, 1)"
} as const;
