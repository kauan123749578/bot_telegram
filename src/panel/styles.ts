import { designSystem as ds } from "./design-system.js";

export const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --bg: ${ds.colors.bgBase};
  --bg-elevated: ${ds.colors.bgElevated};
  --sidebar: ${ds.colors.bgSidebar};
  --card: ${ds.colors.bgCard};
  --card-solid: ${ds.colors.bgCardSolid};
  --glass-blur: ${ds.glass.blur};
  --glass-shadow: ${ds.glass.shadow};
  --border: ${ds.colors.border};
  --border-hi: ${ds.colors.borderHighlight};
  --primary: ${ds.colors.primary};
  --primary-hover: ${ds.colors.primaryHover};
  --primary-dim: ${ds.colors.primaryDim};
  --primary-glow: ${ds.colors.primaryGlow};
  --text: ${ds.colors.text};
  --text-2: ${ds.colors.textSecondary};
  --muted: ${ds.colors.muted};
  --success: ${ds.colors.success};
  --success-bg: ${ds.colors.successBg};
  --danger: ${ds.colors.danger};
  --warning: ${ds.colors.warning};
  --warning-bg: ${ds.colors.warningBg};
  --font-display: ${ds.fonts.display};
  --font: ${ds.fonts.sans};
  --font-mono: ${ds.fonts.mono};
  --ease: ${ds.motion};
  --radius: 14px;
  --radius-lg: 20px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Ambiente: mesh + grão */
.ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 55% at 8% -8%, rgba(61, 200, 255, 0.28), transparent 52%),
    radial-gradient(ellipse 60% 45% at 92% 12%, rgba(94, 228, 168, 0.12), transparent 48%),
    radial-gradient(ellipse 50% 40% at 50% 110%, rgba(61, 200, 255, 0.1), transparent 42%),
    linear-gradient(180deg, #050a12 0%, #081018 40%, #050a12 100%);
}
.ambient::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

a { color: inherit; text-decoration: none; }
button, input, textarea, select { font-family: inherit; }

.app {
  display: flex;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

@keyframes rise-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.content > * {
  animation: rise-in 0.55s var(--ease) both;
}
.content > *:nth-child(1) { animation-delay: 0.04s; }
.content > *:nth-child(2) { animation-delay: 0.1s; }
.content > *:nth-child(3) { animation-delay: 0.16s; }
.content > *:nth-child(4) { animation-delay: 0.22s; }

/* Sidebar */
.sidebar {
  width: 268px;
  background: var(--sidebar);
  backdrop-filter: blur(var(--glass-blur)) saturate(${ds.glass.saturate});
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(${ds.glass.saturate});
  border-right: 1px solid var(--border);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 22px 16px;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 40;
  overflow-y: auto;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 12px;
  padding: 2px 10px 22px;
  font-family: var(--font-display);
  font-weight: 800; font-size: 1.15rem;
  letter-spacing: -0.03em;
}
.sidebar-brand .logo {
  width: 38px; height: 38px; border-radius: 13px;
  background: linear-gradient(145deg, rgba(61, 200, 255, 0.95), rgba(94, 228, 168, 0.55));
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 6px 24px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  display: grid; place-items: center;
  color: #041018; font-size: 0.72rem; font-weight: 800;
}
.btn-new {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px;
  background: linear-gradient(135deg, rgba(61, 200, 255, 0.95) 0%, rgba(45, 170, 220, 0.9) 100%);
  color: #041018; border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-weight: 700; font-size: 0.88rem;
  cursor: pointer; margin-bottom: 22px;
  box-shadow: 0 8px 28px rgba(61, 200, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: transform var(--ease), box-shadow var(--ease);
}
.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(61, 200, 255, 0.45);
}

.nav-section { margin-bottom: 8px; }
.nav-label {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--muted);
  padding: 8px 12px 6px;
}
.nav a, .nav button.nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 12px; border-radius: 11px;
  color: var(--text-2); font-weight: 600; font-size: 0.86rem;
  border: 1px solid transparent; background: transparent;
  width: 100%; text-align: left; cursor: pointer;
  transition: all var(--ease);
}
.nav a:hover, .nav button.nav-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.06);
}
.nav a.active {
  background: linear-gradient(135deg, rgba(61, 200, 255, 0.16), rgba(61, 200, 255, 0.06));
  color: var(--primary);
  border-color: rgba(61, 200, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.nav svg { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.9; }

.sidebar-plan {
  margin-top: auto;
  padding: 16px;
  background: var(--card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
}
.sidebar-plan strong {
  display: block; font-family: var(--font-display);
  font-size: 0.88rem; margin-bottom: 4px;
}
.sidebar-plan span { font-size: 0.74rem; color: var(--muted); }
.sidebar-plan a {
  display: block; margin-top: 12px; text-align: center;
  padding: 9px; border-radius: 10px; font-size: 0.78rem; font-weight: 600;
  background: rgba(61, 200, 255, 0.1); color: var(--primary);
  border: 1px solid rgba(61, 200, 255, 0.2);
}
.sidebar-plan a:hover { background: rgba(61, 200, 255, 0.18); }

/* Main */
.main-wrap {
  flex: 1; margin-left: 268px;
  display: flex; flex-direction: column; min-height: 100vh;
}
.topbar {
  height: 68px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px;
  background: rgba(8, 16, 28, 0.65);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.2);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  position: sticky; top: 0; z-index: 30;
}
.topbar-left h1 {
  font-family: var(--font-display);
  font-size: 1.35rem; font-weight: 800;
  letter-spacing: -0.04em;
}
.topbar-right { display: flex; align-items: center; gap: 12px; }
.icon-btn {
  width: 42px; height: 42px; border-radius: 13px;
  border: 1px solid var(--border);
  background: rgba(14, 28, 46, 0.6);
  backdrop-filter: blur(14px);
  color: var(--text-2); cursor: pointer;
  display: grid; place-items: center;
  transition: all var(--ease);
}
.icon-btn:hover {
  border-color: rgba(61, 200, 255, 0.4);
  color: var(--primary);
  box-shadow: 0 0 20px rgba(61, 200, 255, 0.15);
}
.user-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 14px 6px 6px;
  background: rgba(14, 28, 46, 0.7);
  backdrop-filter: blur(14px);
  border: 1px solid var(--border-hi);
  border-radius: 999px;
}
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #5ee4a8);
  display: grid; place-items: center;
  font-size: 0.68rem; font-weight: 800; color: #041018;
}
.user-pill .name { font-weight: 700; font-size: 0.84rem; }
.user-pill .role { font-size: 0.7rem; color: var(--muted); }

.content { padding: 28px 32px 48px; flex: 1; transition: opacity 0.2s var(--ease); }

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px; margin-bottom: 22px;
}
@media (max-width: 1100px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }

.stat-card {
  background: var(--card);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.15);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.15);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  box-shadow: var(--glass-shadow);
  transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease);
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(61, 200, 255, 0.5), transparent);
  opacity: 0.6;
}
.stat-card:hover {
  border-color: rgba(61, 200, 255, 0.35);
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow), 0 0 40px rgba(61, 200, 255, 0.08);
}
.stat-icon {
  width: 46px; height: 46px; border-radius: 14px;
  display: grid; place-items: center; flex-shrink: 0;
}
.stat-icon.purple { background: rgba(61, 200, 255, 0.14); color: var(--primary); }
.stat-icon.green { background: var(--success-bg); color: var(--success); }
.stat-icon.blue { background: rgba(100, 181, 239, 0.14); color: #7dd3fc; }
.stat-icon.orange { background: var(--warning-bg); color: var(--warning); }
.stat-label { font-size: 0.78rem; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value {
  font-family: var(--font-display);
  font-size: 1.75rem; font-weight: 800;
  letter-spacing: -0.04em; margin: 6px 0 2px;
}
.stat-delta { font-size: 0.74rem; color: var(--success); font-weight: 600; }

/* Cards */
.card {
  background: var(--card);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.12);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}
.card--table { overflow: visible; }
.card-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.card-head h3 {
  font-family: var(--font-display);
  font-size: 1.02rem; font-weight: 700;
  letter-spacing: -0.02em;
}
.card-body { padding: 18px 22px; }
.card-body--flush { padding: 0; }
.card-foot {
  padding: 14px 22px;
  border-top: 1px solid var(--border);
}
.card-link { font-size: 0.82rem; color: var(--primary); font-weight: 600; }
.card-link:hover { text-decoration: underline; }

.grid-2 { display: grid; grid-template-columns: 1.45fr 1fr; gap: 18px; margin-bottom: 18px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1.25fr 1fr; gap: 18px; }
@media (max-width: 1200px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .sidebar { transform: translateX(-100%); }
  .main-wrap { margin-left: 0; }
}

/* Table — scroll + ações fixas (corrige corte dos botões) */
.table-scroll {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
.table th {
  text-align: left;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-weight: 700;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.table td {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: rgba(61, 200, 255, 0.03); }

.table-instances .th-actions,
.table-instances .td-actions {
  text-align: right;
  min-width: 220px;
  width: 220px;
}
.table-instances .td-actions {
  position: sticky;
  right: 0;
  z-index: 2;
  background: linear-gradient(90deg, transparent 0%, var(--card-solid) 28%);
  box-shadow: -16px 0 32px rgba(5, 10, 18, 0.85);
}

.bot-cell { display: flex; align-items: center; gap: 12px; min-width: 180px; }
.bot-av {
  width: 42px; height: 42px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #5ee4a8);
  background-size: cover; background-position: center;
  display: grid; place-items: center;
  font-weight: 800; font-size: 0.78rem; color: #041018;
  flex-shrink: 0; overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.12);
}
.bot-av.has-photo { color: transparent; }
.bot-cell .title { font-weight: 700; font-size: 0.9rem; }
.bot-cell .sub { font-size: 0.76rem; color: var(--muted); font-family: var(--font-mono); }

.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 700;
  white-space: nowrap;
}
.badge-online { background: var(--success-bg); color: var(--success); border: 1px solid rgba(94, 228, 168, 0.25); }
.badge-paused { background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(255, 200, 87, 0.25); }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.metric { font-weight: 600; font-size: 0.88rem; font-variant-numeric: tabular-nums; }

.row-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.row-actions form { display: inline-flex; margin: 0; }

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid var(--border-hi);
  background: rgba(14, 28, 46, 0.85);
  color: var(--text-2);
  cursor: pointer;
  transition: all var(--ease);
  text-decoration: none;
}
.action-btn__icon { display: flex; width: 16px; height: 16px; }
.action-btn__icon svg { width: 16px; height: 16px; }
.action-btn:hover {
  border-color: rgba(61, 200, 255, 0.45);
  color: var(--primary);
  background: rgba(61, 200, 255, 0.12);
  box-shadow: 0 0 16px rgba(61, 200, 255, 0.12);
}
.action-btn--ghost {
  background: transparent;
  border-color: var(--border);
}
.action-btn--danger {
  padding: 8px 10px;
  border-color: rgba(255, 107, 107, 0.25);
  color: var(--danger);
}
.action-btn--danger:hover {
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.45);
  color: #ff8a8a;
  box-shadow: none;
}

@media (max-width: 900px) {
  .action-btn__label { display: none; }
  .action-btn { padding: 8px 10px; }
  .table-instances .th-actions,
  .table-instances .td-actions { min-width: 140px; width: 140px; }
}

/* Activity */
.activity-item {
  display: flex; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon {
  width: 38px; height: 38px; border-radius: 12px;
  display: grid; place-items: center; flex-shrink: 0;
}
.activity-icon.pay { background: var(--success-bg); color: var(--success); }
.activity-icon.lead { background: rgba(61, 200, 255, 0.12); color: var(--primary); }
.activity-icon.sale { background: rgba(94, 228, 168, 0.1); color: #5ee4a8; }
.activity-text { flex: 1; font-size: 0.85rem; line-height: 1.45; }
.activity-text strong { color: var(--text); }
.activity-time { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }

.quick-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
@media (max-width: 600px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 18px 12px; border-radius: var(--radius);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-2); font-size: 0.76rem; font-weight: 600;
  text-align: center; transition: all var(--ease); cursor: pointer;
}
.quick-item:hover {
  border-color: rgba(61, 200, 255, 0.45);
  color: var(--primary);
  background: var(--primary-dim);
  transform: translateY(-2px);
}
.quick-item svg { width: 22px; height: 22px; color: var(--primary); }

.chart-wrap { height: 180px; position: relative; }
.chart-svg { width: 100%; height: 100%; }

.product-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.product-row:last-child { border-bottom: none; }
.product-left { display: flex; align-items: center; gap: 10px; }
.product-rank {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--primary-dim); color: var(--primary);
  display: grid; place-items: center; font-size: 0.75rem; font-weight: 800;
}
.product-price { font-weight: 700; color: var(--success); font-size: 0.88rem; }

.alert {
  padding: 14px 18px; border-radius: var(--radius); margin-bottom: 18px;
  font-size: 0.88rem; font-weight: 500;
}
.alert-success { background: var(--success-bg); border: 1px solid rgba(94, 228, 168, 0.35); color: #9ef0c8; }
.alert-error { background: rgba(255, 107, 107, 0.12); border: 1px solid rgba(255, 107, 107, 0.35); color: #ffb4b4; }

.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label, .field > span:first-child { font-size: 0.8rem; font-weight: 600; color: var(--text-2); }
.field input, .field textarea, .field select {
  background: rgba(5, 10, 18, 0.8);
  border: 1px solid var(--border);
  border-radius: 11px; padding: 12px 14px; color: var(--text);
  font-size: 0.9rem; outline: none;
  transition: border-color var(--ease), box-shadow var(--ease);
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color: rgba(61, 200, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(61, 200, 255, 0.12);
}
.field textarea { min-height: 110px; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid .span-2 { grid-column: span 2; }
.form-section {
  padding: 18px;
  border-radius: var(--radius);
  border: 1px solid rgba(61, 200, 255, 0.22);
  background: rgba(61, 200, 255, 0.06);
  margin-bottom: 4px;
}
.form-section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.form-section-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(61, 200, 255, 0.15);
  color: var(--primary);
  flex-shrink: 0;
}
.form-section-icon svg { width: 20px; height: 20px; }
.form-section h4 {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.form-section p { font-size: 0.8rem; color: var(--text-2); line-height: 1.45; }
.form-hint {
  font-size: 0.76rem;
  color: var(--muted);
  margin-top: 8px;
  line-height: 1.4;
}
.delay-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.dropzone-audio {
  border-color: rgba(94, 228, 168, 0.35);
  background: rgba(94, 228, 168, 0.06);
}
@media (max-width: 700px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .span-2 { grid-column: span 1; }
  .delay-grid { grid-template-columns: 1fr; }
}

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 20px; border-radius: 11px;
  font-family: var(--font-display);
  font-weight: 700; font-size: 0.86rem;
  border: none; cursor: pointer; transition: all var(--ease);
}
.btn-sm { padding: 8px 14px; font-size: 0.78rem; border-radius: 10px; }
.btn-primary {
  background: linear-gradient(135deg, rgba(61, 200, 255, 0.95), rgba(45, 170, 220, 0.9));
  color: #041018;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 24px rgba(61, 200, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 32px rgba(61, 200, 255, 0.4);
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  border: 1px solid var(--border-hi);
}
.btn-secondary:hover {
  background: rgba(61, 200, 255, 0.1);
  border-color: rgba(61, 200, 255, 0.35);
  color: var(--text);
}
.btn-block { width: 100%; }

.dropzone {
  border: 1px dashed rgba(61, 200, 255, 0.4);
  border-radius: var(--radius);
  padding: 22px;
  text-align: center;
  background: rgba(61, 200, 255, 0.05);
  cursor: pointer;
  transition: border-color var(--ease), background var(--ease);
}
.dropzone:hover { border-color: rgba(61, 200, 255, 0.65); background: rgba(61, 200, 255, 0.1); }

.media-preview-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.media-preview-chip {
  font-size: 0.72rem; padding: 4px 10px; border-radius: 999px;
  background: var(--primary-dim);
  border: 1px solid rgba(61, 200, 255, 0.28);
  color: var(--text-2);
  font-family: var(--font-mono);
}
.dropzone input { margin-top: 8px; width: 100%; }

.footer {
  text-align: center; padding: 22px;
  font-size: 0.76rem; color: var(--muted);
  border-top: 1px solid var(--border);
}

/* Login */
.login-page {
  min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr;
  position: relative; z-index: 1;
}
@media (max-width: 900px) {
  .login-page { grid-template-columns: 1fr; }
  .login-hero { display: none; }
}
.login-hero {
  padding: 56px;
  display: flex; flex-direction: column; justify-content: center;
  border-right: 1px solid var(--border);
}
.login-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 800; letter-spacing: -0.04em;
  margin-bottom: 16px; line-height: 1.1;
}
.login-form { display: flex; align-items: center; justify-content: center; padding: 40px; }
.login-box {
  width: min(420px, 100%);
  padding: 36px;
  background: var(--card);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
}
.login-box h2 {
  font-family: var(--font-display);
  font-size: 1.6rem; font-weight: 800;
  letter-spacing: -0.03em; margin-bottom: 8px;
}
.empty { text-align: center; padding: 36px; color: var(--muted); }

/* Live panel */
.panel-toasts {
  position: fixed; top: 84px; right: 24px; z-index: 9999;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
}
.panel-toast {
  pointer-events: auto; min-width: 280px; max-width: 360px;
  padding: 14px 16px; border-radius: var(--radius);
  background: var(--card-solid);
  border: 1px solid rgba(61, 200, 255, 0.45);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  transform: translateX(120%); opacity: 0;
  transition: all 0.35s var(--ease);
  display: grid; gap: 4px; position: relative;
}
.panel-toast.show { transform: translateX(0); opacity: 1; }
.panel-toast strong { color: var(--success); font-size: 0.88rem; }
.panel-toast span { color: var(--text-2); font-size: 0.82rem; line-height: 1.4; }
.panel-toast button {
  position: absolute; top: 8px; right: 10px; border: none; background: transparent;
  color: var(--muted); cursor: pointer; font-size: 1.1rem;
}

.bell-wrap { position: relative; }
.bell-badge {
  position: absolute; top: -4px; right: -4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--danger); color: #fff;
  font-size: 0.65rem; font-weight: 800;
  display: none; align-items: center; justify-content: center;
}
.bell-menu {
  display: none; position: absolute; top: calc(100% + 8px); right: 0;
  width: min(320px, 90vw); max-height: 360px; overflow-y: auto;
  background: var(--card-solid);
  border: 1px solid var(--border-hi);
  border-radius: var(--radius);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.55);
  z-index: 100;
}
.bell-menu.open { display: block; }
.bell-item {
  padding: 12px 14px; border-bottom: 1px solid var(--border);
  display: grid; gap: 4px;
}
.bell-item strong { font-size: 0.82rem; color: var(--success); }
.bell-item span { font-size: 0.78rem; color: var(--text-2); }
.bell-item time { font-size: 0.7rem; color: var(--muted); }
.bell-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 0.85rem; }

.rank-row { margin-bottom: 14px; }
.rank-row:last-child { margin-bottom: 0; }
.rank-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rank-info { flex: 1; min-width: 0; }
.rank-name { display: block; font-weight: 700; font-size: 0.88rem; }
.rank-meta { display: block; font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
.rank-bar {
  height: 6px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06); overflow: hidden;
}
.rank-bar span {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), #5ee4a8);
  transition: width 0.5s var(--ease);
}
.product-rank.rank-gold { background: rgba(255, 200, 87, 0.2); color: #ffc857; }
.product-rank.rank-silver { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
.product-rank.rank-bronze { background: rgba(255, 140, 80, 0.15); color: #fdba74; }
`;
