import { designSystem as ds } from "./design-system.js";

export const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --bg: ${ds.colors.bgBase};
  --sidebar: ${ds.colors.bgSidebar};
  --card: ${ds.colors.bgCard};
  --border: ${ds.colors.border};
  --primary: ${ds.colors.primary};
  --primary-hover: ${ds.colors.primaryHover};
  --primary-dim: ${ds.colors.primaryDim};
  --text: ${ds.colors.text};
  --text-2: ${ds.colors.textSecondary};
  --muted: ${ds.colors.muted};
  --success: ${ds.colors.success};
  --success-bg: ${ds.colors.successBg};
  --danger: ${ds.colors.danger};
  --warning: ${ds.colors.warning};
  --warning-bg: ${ds.colors.warningBg};
  --font: ${ds.fonts.sans};
  --ease: ${ds.motion};
  --radius: 12px;
  --radius-lg: 16px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-size: 14px;
}

a { color: inherit; text-decoration: none; }
button, input, textarea, select { font-family: inherit; }

.app { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 40;
  overflow-y: auto;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 10px 20px;
  font-weight: 800; font-size: 1.1rem;
}
.sidebar-brand .logo {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), #64b5ef);
  display: grid; place-items: center;
  color: #fff; font-size: 0.75rem; font-weight: 800;
}
.btn-new {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px;
  background: var(--primary);
  color: #fff; border: none; border-radius: var(--radius);
  font-weight: 700; font-size: 0.9rem;
  cursor: pointer; margin-bottom: 20px;
  transition: background var(--ease), transform var(--ease);
}
.btn-new:hover { background: var(--primary-hover); transform: translateY(-1px); }

.nav-section { margin-bottom: 8px; }
.nav-label {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--muted);
  padding: 8px 12px 6px;
}
.nav a, .nav button.nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  color: var(--text-2); font-weight: 600; font-size: 0.88rem;
  border: none; background: transparent; width: 100%;
  text-align: left; cursor: pointer; transition: all var(--ease);
}
.nav a:hover, .nav button.nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--text); }
.nav a.active { background: var(--primary-dim); color: var(--primary); }
.nav a.disabled { opacity: 0.45; pointer-events: none; }
.nav svg { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.85; }

.sidebar-plan {
  margin-top: auto;
  padding: 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.sidebar-plan strong { display: block; font-size: 0.85rem; margin-bottom: 4px; }
.sidebar-plan span { font-size: 0.75rem; color: var(--muted); }
.sidebar-plan a {
  display: block; margin-top: 10px; text-align: center;
  padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;
  background: rgba(255,255,255,0.05); color: var(--text-2);
}
.sidebar-plan a:hover { background: rgba(255,255,255,0.08); color: var(--text); }

/* Main */
.main-wrap {
  flex: 1; margin-left: 260px;
  display: flex; flex-direction: column; min-height: 100vh;
}
.topbar {
  height: 64px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; background: rgba(12,14,20,0.9);
  backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 30;
}
.topbar-left { display: flex; align-items: center; gap: 14px; }
.topbar-left h1 { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.icon-btn {
  width: 40px; height: 40px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--card);
  color: var(--text-2); cursor: pointer;
  display: grid; place-items: center;
}
.user-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px 6px 6px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 999px;
}
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #229ed9);
  display: grid; place-items: center; font-size: 0.7rem; font-weight: 800;
}
.user-pill .name { font-weight: 700; font-size: 0.85rem; }
.user-pill .role { font-size: 0.72rem; color: var(--muted); }

.content { padding: 24px 28px 40px; flex: 1; }

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px; margin-bottom: 20px;
}
@media (max-width: 1100px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex; align-items: flex-start; gap: 14px;
}
.stat-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: grid; place-items: center; flex-shrink: 0;
}
.stat-icon.purple { background: rgba(42,171,238,0.15); color: var(--primary); }
.stat-icon.green { background: rgba(34,197,94,0.12); color: var(--success); }
.stat-icon.blue { background: rgba(59,130,246,0.12); color: #3b82f6; }
.stat-icon.orange { background: var(--warning-bg); color: var(--warning); }
.stat-label { font-size: 0.8rem; color: var(--muted); font-weight: 500; }
.stat-value { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.03em; margin: 4px 0; }
.stat-delta { font-size: 0.75rem; color: var(--success); font-weight: 600; }

/* Cards */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.card-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.card-head h3 { font-size: 1rem; font-weight: 700; }
.card-body { padding: 16px 20px; }
.card-link { font-size: 0.82rem; color: var(--primary); font-weight: 600; }

.grid-2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 16px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 16px; }
@media (max-width: 1200px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .sidebar { transform: translateX(-100%); }
  .main-wrap { margin-left: 0; }
}

/* Table */
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left; font-size: 0.72rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--muted); font-weight: 600;
  padding: 10px 12px; border-bottom: 1px solid var(--border);
}
.table td { padding: 14px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: rgba(255,255,255,0.02); }

.bot-cell { display: flex; align-items: center; gap: 12px; }
.bot-av {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #229ed9);
  background-size: cover; background-position: center;
  display: grid; place-items: center; font-weight: 800; font-size: 0.8rem;
  flex-shrink: 0; overflow: hidden;
}
.bot-av.has-photo { color: transparent; }
.bot-cell .title { font-weight: 700; font-size: 0.9rem; }
.bot-cell .sub { font-size: 0.78rem; color: var(--muted); }

.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 700;
}
.badge-online { background: var(--success-bg); color: var(--success); }
.badge-paused { background: var(--warning-bg); color: var(--warning); }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.metric { font-weight: 600; font-size: 0.88rem; }
.row-actions { display: flex; gap: 6px; }
.row-actions form { display: inline; }
.btn-icon {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-2); cursor: pointer;
  display: grid; place-items: center;
}
.btn-icon:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.btn-icon.danger:hover { color: var(--danger); border-color: rgba(239,68,68,0.3); }

/* Activity feed */
.activity-item {
  display: flex; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: grid; place-items: center; flex-shrink: 0;
}
.activity-icon.pay { background: rgba(34,197,94,0.12); color: var(--success); }
.activity-icon.lead { background: rgba(59,130,246,0.12); color: #3b82f6; }
.activity-icon.sale { background: rgba(42,171,238,0.12); color: var(--primary); }
.activity-text { flex: 1; font-size: 0.85rem; line-height: 1.4; }
.activity-text strong { color: var(--text); }
.activity-time { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }

/* Quick config */
.quick-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
@media (max-width: 600px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px 10px; border-radius: var(--radius);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  color: var(--text-2); font-size: 0.78rem; font-weight: 600;
  text-align: center; transition: all var(--ease); cursor: pointer;
}
.quick-item:hover { border-color: rgba(42,171,238,0.45); color: var(--primary); background: var(--primary-dim); }
.quick-item svg { width: 22px; height: 22px; color: var(--primary); }

/* Chart placeholder */
.chart-wrap { height: 180px; position: relative; }
.chart-svg { width: 100%; height: 100%; }

/* Top products */
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

/* Forms */
.alert {
  padding: 12px 16px; border-radius: var(--radius); margin-bottom: 16px;
  font-size: 0.88rem; font-weight: 500;
}
.alert-success { background: var(--success-bg); border: 1px solid rgba(34,197,94,0.3); color: #86efac; }
.alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }

.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 0.82rem; font-weight: 600; color: var(--text-2); }
.field input, .field textarea, .field select {
  background: #0a0c12; border: 1px solid var(--border);
  border-radius: 10px; padding: 11px 14px; color: var(--text);
  font-size: 0.9rem; outline: none;
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color: rgba(42,171,238,0.5);
  box-shadow: 0 0 0 3px rgba(42,171,238,0.12);
}
.field textarea { min-height: 100px; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid .span-2 { grid-column: span 2; }
@media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .form-grid .span-2 { grid-column: span 1; } }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 20px; border-radius: 10px; font-weight: 700;
  font-size: 0.88rem; border: none; cursor: pointer; transition: all var(--ease);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary {
  background: transparent; color: var(--text-2);
  border: 1px solid var(--border);
}
.btn-secondary:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.btn-block { width: 100%; }

.dropzone {
  border: 1px dashed rgba(42,171,238,0.4); border-radius: var(--radius);
  padding: 20px; text-align: center; background: rgba(42,171,238,0.04);
  cursor: pointer;
}
.dropzone input { margin-top: 8px; width: 100%; }

.footer {
  text-align: center; padding: 20px;
  font-size: 0.78rem; color: var(--muted);
  border-top: 1px solid var(--border);
}

/* Login */
.login-page {
  min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
  background: var(--bg);
}
@media (max-width: 900px) { .login-page { grid-template-columns: 1fr; } .login-hero { display: none; } }
.login-hero {
  padding: 48px; display: flex; flex-direction: column; justify-content: center;
  background: linear-gradient(160deg, rgba(42,171,238,0.12), transparent 60%), var(--sidebar);
  border-right: 1px solid var(--border);
}
.login-hero h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 12px; }
.login-form { display: flex; align-items: center; justify-content: center; padding: 32px; }
.login-box { width: min(400px, 100%); }
.login-box h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
.empty { text-align: center; padding: 32px; color: var(--muted); }

/* Live panel: toasts, bell, ranking */
.panel-toasts {
  position: fixed; top: 80px; right: 20px; z-index: 9999;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
}
.panel-toast {
  pointer-events: auto; min-width: 280px; max-width: 360px;
  padding: 14px 16px; border-radius: var(--radius);
  background: #17212b; border: 1px solid rgba(42,171,238,0.45);
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  transform: translateX(120%); opacity: 0; transition: all 0.35s var(--ease);
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
  background: var(--danger); color: #fff; font-size: 0.65rem; font-weight: 800;
  display: none; align-items: center; justify-content: center;
}
.bell-menu {
  display: none; position: absolute; top: calc(100% + 8px); right: 0;
  width: min(320px, 90vw); max-height: 360px; overflow-y: auto;
  background: #12141c; border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: 0 16px 48px rgba(0,0,0,0.5); z-index: 100;
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
  height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden;
}
.rank-bar span {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), #229ed9);
  transition: width 0.5s var(--ease);
}
.product-rank.rank-gold { background: rgba(234,179,8,0.2); color: #facc15; }
.product-rank.rank-silver { background: rgba(148,163,184,0.15); color: #cbd5e1; }
.product-rank.rank-bronze { background: rgba(180,83,9,0.15); color: #fdba74; }

.content { transition: opacity 0.2s var(--ease); }
`;
