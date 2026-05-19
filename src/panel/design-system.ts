/**
 * Design system — UI UX Pro Max
 * Product: AI / Chatbot SaaS dashboard
 * Style: Glassmorphism + Soft UI (dark OLED)
 * Typography: Plus Jakarta Sans + JetBrains Mono
 * Avoid: AI purple/pink gradients, emoji icons, low contrast
 */
export const designSystem = {
  colors: {
    bgBase: "#070b14",
    bgElevated: "#0f172a",
    glass: "rgba(15, 23, 42, 0.65)",
    glassBorder: "rgba(148, 163, 184, 0.12)",
    primary: "#2dd4bf",
    primaryDim: "rgba(45, 212, 191, 0.15)",
    primaryHover: "#14b8a6",
    accent: "#38bdf8",
    text: "#f1f5f9",
    textSecondary: "#cbd5e1",
    muted: "#64748b",
    success: "#34d399",
    successBg: "rgba(52, 211, 153, 0.12)",
    danger: "#f87171",
    dangerBg: "rgba(248, 113, 113, 0.12)",
    warning: "#fbbf24",
    warningBg: "rgba(251, 191, 36, 0.12)"
  },
  fonts: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
  },
  motion: "200ms cubic-bezier(0.4, 0, 0.2, 1)"
} as const;
