import type { BotConfig } from "../bots.js";
import { designSystem as ds } from "./design-system.js";
import { icons } from "./icons.js";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  color-scheme: dark;
  --bg: ${ds.colors.bgBase};
  --glass: ${ds.colors.glass};
  --border: ${ds.colors.glassBorder};
  --primary: ${ds.colors.primary};
  --primary-dim: ${ds.colors.primaryDim};
  --primary-hover: ${ds.colors.primaryHover};
  --accent: ${ds.colors.accent};
  --text: ${ds.colors.text};
  --text-2: ${ds.colors.textSecondary};
  --muted: ${ds.colors.muted};
  --success: ${ds.colors.success};
  --success-bg: ${ds.colors.successBg};
  --danger: ${ds.colors.danger};
  --danger-bg: ${ds.colors.dangerBg};
  --warning: ${ds.colors.warning};
  --warning-bg: ${ds.colors.warningBg};
  --radius: 14px;
  --radius-lg: 20px;
  --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  --ease: ${ds.motion};
  --font: ${ds.fonts.sans};
  --mono: ${ds.fonts.mono};
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 100% 80% at 0% -20%, rgba(45, 212, 191, 0.12), transparent 50%),
    radial-gradient(ellipse 80% 60% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 45%),
    radial-gradient(ellipse 50% 40% at 50% 100%, rgba(45, 212, 191, 0.05), transparent);
}

a { color: var(--accent); text-decoration: none; transition: color var(--ease); }
a:hover { color: var(--primary); }

.app { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: 272px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: rgba(7, 11, 20, 0.85);
  backdrop-filter: blur(24px);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px 28px;
}
.brand-mark {
  width: 44px; height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  display: grid; place-items: center;
  color: #042f2e;
  font-weight: 800;
  font-size: 1rem;
  box-shadow: 0 8px 24px rgba(45, 212, 191, 0.35);
}
.brand h1 { margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -0.03em; }
.brand p { margin: 2px 0 0; font-size: 0.75rem; color: var(--muted); font-weight: 500; }

.nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.nav a, .nav button.nav-btn {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius);
  color: var(--text-2);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background var(--ease), color var(--ease), border-color var(--ease);
  width: 100%;
  text-align: left;
  font-family: inherit;
}
.nav a:hover, .nav button.nav-btn:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text);
}
.nav a.active {
  background: var(--primary-dim);
  border-color: rgba(45, 212, 191, 0.25);
  color: var(--primary);
}
.nav a svg, .nav button.nav-btn svg { opacity: 0.85; flex-shrink: 0; }
.nav a.active svg { opacity: 1; color: var(--primary); }

.sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }

/* Main */
.main { flex: 1; min-width: 0; padding: 28px 32px 48px; max-width: 1400px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.page-header h2 {
  margin: 0;
  font-size: clamp(1.5rem, 2.5vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.04em;
}
.page-header .subtitle { margin: 8px 0 0; color: var(--muted); font-size: 0.95rem; max-width: 520px; line-height: 1.5; }

/* Stats bento */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 1024px) { .stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .stats { grid-template-columns: 1fr; } }

.stat-card {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  backdrop-filter: blur(16px);
  transition: border-color var(--ease), transform var(--ease);
}
.stat-card:hover { border-color: rgba(45, 212, 191, 0.2); transform: translateY(-1px); }
.stat-label { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; margin-top: 6px; line-height: 1; }
.stat-card.accent .stat-value { color: var(--primary); }

/* Layout */
.split { display: grid; grid-template-columns: 1fr 1.05fr; gap: 24px; align-items: start; }
@media (max-width: 1100px) { .split { grid-template-columns: 1fr; } }

.panel {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.panel-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.panel-head h3 { margin: 0; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.02em; }
.panel-body { padding: 24px; }

/* Forms */
.form-section { margin-bottom: 24px; }
.form-section:last-child { margin-bottom: 0; }
.form-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary);
  margin-bottom: 14px;
}
.form-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); }
.form-grid .span-2 { grid-column: span 2; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .form-grid .span-2 { grid-column: span 1; } }

label.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-2);
}
label.field .hint { font-weight: 400; color: var(--muted); font-size: 0.75rem; }

input, textarea, select {
  width: 100%;
  background: rgba(7, 11, 20, 0.9);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  padding: 12px 14px;
  font: inherit;
  font-size: 0.92rem;
  outline: none;
  transition: border-color var(--ease), box-shadow var(--ease);
}
input:hover, textarea:hover, select:hover { border-color: rgba(148, 163, 184, 0.25); }
input:focus, textarea:focus, select:focus {
  border-color: rgba(45, 212, 191, 0.55);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
}
textarea { min-height: 108px; resize: vertical; line-height: 1.5; }

.dropzone {
  border: 1px dashed rgba(45, 212, 191, 0.35);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  background: rgba(45, 212, 191, 0.04);
  cursor: pointer;
  transition: background var(--ease), border-color var(--ease);
}
.dropzone:hover { background: rgba(45, 212, 191, 0.08); border-color: var(--primary); }
.dropzone input[type="file"] { padding: 0; border: 0; background: transparent; cursor: pointer; }
.dropzone-icon { color: var(--primary); margin-bottom: 8px; display: flex; justify-content: center; }
.dropzone p { margin: 0; font-size: 0.85rem; color: var(--muted); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 12px 20px;
  cursor: pointer;
  transition: transform var(--ease), box-shadow var(--ease), background var(--ease), opacity var(--ease);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary-hover), var(--primary));
  color: #042f2e;
  box-shadow: 0 4px 20px rgba(45, 212, 191, 0.35);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(45, 212, 191, 0.45); }
.btn-secondary {
  background: rgba(255,255,255,0.05);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(148,163,184,0.25); }
.btn-danger {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  padding: 8px 14px;
  font-size: 0.82rem;
}
.btn-danger:hover { background: rgba(248, 113, 113, 0.2); }
.btn-block { width: 100%; }

/* Alerts */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  margin-bottom: 20px;
  font-size: 0.9rem;
  line-height: 1.45;
}
.alert-success { background: var(--success-bg); border: 1px solid rgba(52, 211, 153, 0.3); color: #6ee7b7; }
.alert-error { background: var(--danger-bg); border: 1px solid rgba(248, 113, 113, 0.3); color: #fca5a5; }

/* Bot cards */
.bot-grid { display: flex; flex-direction: column; gap: 14px; }
.bot-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  background: rgba(7, 11, 20, 0.5);
  transition: border-color var(--ease);
}
.bot-card:hover { border-color: rgba(45, 212, 191, 0.2); }
.bot-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.bot-avatar {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-dim), rgba(56, 189, 248, 0.15));
  border: 1px solid var(--border);
  display: grid; place-items: center;
  color: var(--primary);
  flex-shrink: 0;
}
.bot-name { margin: 0; font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; }
.bot-meta { margin: 4px 0 0; font-size: 0.78rem; color: var(--muted); }

.pill {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 5px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.pill-on { background: var(--success-bg); color: var(--success); border: 1px solid rgba(52,211,153,0.25); }
.pill-off { background: rgba(100,116,139,0.15); color: var(--text-2); border: 1px solid var(--border); }

.tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.tag {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-family: var(--mono);
}
.prompt-box {
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-2);
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  max-height: 80px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--muted);
}
.empty-state svg { margin: 0 auto 16px; opacity: 0.4; color: var(--primary); }
.empty-state p { margin: 0; font-size: 0.95rem; }

/* Settings */
.api-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.api-status.ok { background: var(--success-bg); color: var(--success); border: 1px solid rgba(52,211,153,0.25); }
.api-status.warn { background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(251,191,36,0.25); }
.key-display {
  font-family: var(--mono);
  font-size: 0.88rem;
  padding: 14px 16px;
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--accent);
  margin-bottom: 20px;
  word-break: break-all;
}
.info-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.info-list li {
  font-size: 0.88rem;
  color: var(--text-2);
  line-height: 1.55;
  padding-left: 20px;
  position: relative;
}
.info-list li::before {
  content: "";
  position: absolute;
  left: 0; top: 0.55em;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--primary);
}

/* Login */
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 900px) { .login-page { grid-template-columns: 1fr; } .login-hero { display: none; } }

.login-hero {
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--border);
  background:
    linear-gradient(160deg, rgba(45, 212, 191, 0.08) 0%, transparent 50%),
    rgba(7, 11, 20, 0.95);
}
.login-hero h1 {
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  margin: 0 0 16px;
  line-height: 1.1;
}
.login-hero p { color: var(--text-2); font-size: 1.05rem; line-height: 1.6; max-width: 400px; margin: 0; }
.login-features { margin-top: 40px; display: grid; gap: 16px; }
.login-feature {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 16px;
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.login-feature strong { display: block; font-size: 0.9rem; margin-bottom: 4px; }
.login-feature span { font-size: 0.82rem; color: var(--muted); line-height: 1.45; }

.login-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.login-box {
  width: min(400px, 100%);
}
.login-box .brand { padding-bottom: 32px; }
.login-box h2 { margin: 0 0 8px; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.03em; }
.login-box > p { margin: 0 0 28px; color: var(--muted); font-size: 0.95rem; line-height: 1.5; }

/* Mobile nav */
.mobile-bar {
  display: none;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(7,11,20,0.95);
  gap: 8px;
  flex-wrap: wrap;
}
.mobile-bar a {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-2);
}
@media (max-width: 900px) {
  .sidebar { display: none; }
  .mobile-bar { display: flex; }
  .main { padding: 20px 16px 40px; }
}
code { font-family: var(--mono); font-size: 0.85em; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }
`;

const formSubmitScript = `
<script>
document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", () => {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }
  });
});
</script>`;

function layout(title: string, body: string, nav: "dashboard" | "settings" | null) {
  if (!nav) {
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>${body}${formSubmitScript}</body>
</html>`;
  }

  const navDashboard = nav === "dashboard" ? "active" : "";
  const navSettings = nav === "settings" ? "active" : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">IA</div>
        <div>
          <h1>Telegram IA</h1>
          <p>Bot Manager</p>
        </div>
      </div>
      <nav class="nav">
        <a href="/" class="${navDashboard}">${icons.dashboard} Dashboard</a>
        <a href="/settings" class="${navSettings}">${icons.settings} Configurações</a>
      </nav>
      <div class="sidebar-footer">
        <form method="post" action="/logout">
          <button type="submit" class="nav-btn">${icons.logout} Sair da conta</button>
        </form>
      </div>
    </aside>
    <div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <nav class="mobile-bar">
        <a href="/">Dashboard</a>
        <a href="/settings">Configurações</a>
        <form method="post" action="/logout" style="margin-left:auto"><button type="submit" class="btn btn-secondary" style="padding:8px 12px">Sair</button></form>
      </nav>
      <main class="main">${body}</main>
    </div>
  </div>
${formSubmitScript}</body>
</html>`;
}

function alertHtml(message: string, type: "success" | "error" = "success") {
  const cls = type === "error" ? "alert-error" : "alert-success";
  return `<div class="alert ${cls}">${escapeHtml(message)}</div>`;
}

export function loginPage(message = "") {
  const body = `
  <div class="login-page">
    <div class="login-hero">
      <div class="brand">
        <div class="brand-mark">IA</div>
        <div><h1 style="margin:0;font-size:1.1rem">Telegram IA</h1></div>
      </div>
      <h1>Gerencie bots que vendem no automático</h1>
      <p>IA, Pix, comprovantes, prévias e entrega automática — tudo em um painel privado e seguro.</p>
      <div class="login-features">
        <div class="login-feature">
          <span style="color:var(--primary)">${icons.bot}</span>
          <div><strong>Múltiplos bots</strong><span>Cada um com prompt, Pix e mídias próprias.</span></div>
        </div>
        <div class="login-feature">
          <span style="color:var(--primary)">${icons.sparkles}</span>
          <div><strong>IA + comprovante</strong><span>Validação automática de Pix por imagem e PDF.</span></div>
        </div>
        <div class="login-feature">
          <span style="color:var(--primary)">${icons.lock}</span>
          <div><strong>Acesso protegido</strong><span>Somente você acessa com senha do painel.</span></div>
        </div>
      </div>
    </div>
    <div class="login-form-side">
      <div class="login-box">
        <h2>Bem-vindo de volta</h2>
        <p>Entre com a senha configurada no Railway.</p>
        ${message ? alertHtml(message, "error") : ""}
        <form method="post" action="/login">
          <label class="field">Senha do painel
            <input name="password" type="password" placeholder="••••••••" required autofocus autocomplete="current-password" />
          </label>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:20px">Entrar no painel</button>
        </form>
      </div>
    </div>
  </div>`;

  return layout("Login · Telegram IA", body, null);
}

export function dashboardPage(bots: BotConfig[], message = "", isError = false) {
  const active = bots.filter((b) => b.active).length;
  const previews = bots.reduce((s, b) => s + b.previewMediaUrls.length, 0);
  const deliveries = bots.reduce((s, b) => s + b.deliveryMediaUrls.length, 0);

  const list =
    bots.length === 0
      ? `<div class="empty-state">${icons.bot}<p>Nenhum bot cadastrado ainda.<br/>Crie o primeiro usando o formulário ao lado.</p></div>`
      : bots
          .map(
            (bot) => `
      <article class="bot-card">
        <div class="bot-card-top">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div class="bot-avatar">${icons.bot}</div>
            <div>
              <h4 class="bot-name">${escapeHtml(bot.name)}</h4>
              <p class="bot-meta">Telegram Bot</p>
            </div>
          </div>
          <span class="pill ${bot.active ? "pill-on" : "pill-off"}">${bot.active ? "Ativo" : "Pausado"}</span>
        </div>
        <div class="tag-row">
          <span class="tag">Pix · ${escapeHtml(bot.pixKey)}</span>
          <span class="tag">${bot.messageDelayMs}ms delay</span>
          <span class="tag">${bot.previewMediaUrls.length} prévias</span>
          <span class="tag">${bot.deliveryMediaUrls.length} entregas</span>
        </div>
        <div class="prompt-box">${escapeHtml(bot.prompt)}</div>
        <form method="post" action="/bots/${bot.id}/delete">
          <button type="submit" class="btn btn-danger">Remover bot</button>
        </form>
      </article>`
          )
          .join("");

  const body = `
    <header class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p class="subtitle">Configure bots, prompts, mídias e acompanhe o status em tempo real.</p>
      </div>
      <form method="post" action="/restart">
        <button type="submit" class="btn btn-secondary">${icons.sparkles} Reiniciar bots</button>
      </form>
    </header>
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <section class="stats">
      <div class="stat-card"><span class="stat-label">Total</span><div class="stat-value">${bots.length}</div></div>
      <div class="stat-card accent"><span class="stat-label">Ativos</span><div class="stat-value">${active}</div></div>
      <div class="stat-card"><span class="stat-label">Prévias</span><div class="stat-value">${previews}</div></div>
      <div class="stat-card"><span class="stat-label">Entregas</span><div class="stat-value">${deliveries}</div></div>
    </section>
    <section class="split">
      <div class="panel">
        <div class="panel-head">
          <h3>Novo bot</h3>
        </div>
        <div class="panel-body">
          <form method="post" action="/bots" enctype="multipart/form-data">
            <div class="form-section">
              <div class="form-section-title">Identidade</div>
              <div class="form-grid">
                <label class="field">Nome do bot<input name="name" placeholder="Ex: MorenaVIP" required /></label>
                <label class="field">Status<select name="active"><option value="true">Ativo</option><option value="false">Pausado</option></select></label>
                <label class="field span-2">Token Telegram<input name="token" placeholder="123456789:ABC..." required autocomplete="off" /></label>
              </div>
            </div>
            <div class="form-section">
              <div class="form-section-title">Vendas & IA</div>
              <div class="form-grid">
                <label class="field">Chave Pix<input name="pixKey" placeholder="CPF, email ou telefone" required /></label>
                <label class="field">Delay (ms)<input name="messageDelayMs" type="number" value="1500" min="0" /></label>
                <label class="field span-2">Prompt / persona<textarea name="prompt" required>Voce atende leads no Telegram de forma simpatica, curta e persuasiva. Quando pedirem previa, ofereca. Quando pedirem Pix, informe a chave.</textarea></label>
              </div>
            </div>
            <div class="form-section">
              <div class="form-section-title">Mídias</div>
              <div class="form-grid">
                <label class="field span-2">
                  <span>Prévias (upload)</span>
                  <div class="dropzone">
                    <div class="dropzone-icon">${icons.upload}</div>
                    <p>Imagens, vídeos ou áudios</p>
                    <input name="previewFiles" type="file" accept="image/*,video/*,audio/*" multiple />
                  </div>
                </label>
                <label class="field span-2">
                  <span>Entregas (upload)</span>
                  <div class="dropzone">
                    <div class="dropzone-icon">${icons.upload}</div>
                    <p>Arquivos liberados após pagamento</p>
                    <input name="deliveryFiles" type="file" accept="image/*,video/*,audio/*,application/pdf" multiple />
                  </div>
                </label>
                <label class="field span-2">Links prévia <span class="hint">opcional, um por linha</span><textarea name="previewMediaUrls" placeholder="https://..."></textarea></label>
                <label class="field span-2">Links entrega <span class="hint">opcional</span><textarea name="deliveryMediaUrls" placeholder="https://..."></textarea></label>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Salvar e ativar bot</button>
          </form>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>Seus bots</h3>
          <span class="pill pill-on">${bots.length} total</span>
        </div>
        <div class="panel-body">
          <div class="bot-grid">${list}</div>
        </div>
      </div>
    </section>`;

  return layout("Dashboard", body, "dashboard");
}

export function settingsPage(input: {
  message?: string;
  messageIsError?: boolean;
  maskedKey: string;
  configured: boolean;
  source: string;
  model: string;
}) {
  const statusClass = input.configured ? "ok" : "warn";
  const statusText = input.configured
    ? `Conectado · fonte: ${input.source}`
    : "Não configurado — bots não respondem até salvar a chave";

  const body = `
    <header class="page-header">
      <div>
        <h2>Configurações</h2>
        <p class="subtitle">API Key do ChatGPT, modelo de IA e segurança do painel.</p>
      </div>
    </header>
    ${input.message ? alertHtml(input.message, input.messageIsError ? "error" : "success") : ""}
    <section class="split">
      <div class="panel">
        <div class="panel-head">
          <h3>${icons.sparkles.replace('width="20"','width="18"').replace('height="20"','height="18"')} OpenAI / ChatGPT</h3>
        </div>
        <div class="panel-body">
          <div class="api-status ${statusClass}">${statusText}</div>
          ${input.configured ? `<div class="key-display">${escapeHtml(input.maskedKey)}</div>` : ""}
          <form method="post" action="/settings">
            <label class="field">
              API Key
              <span class="hint">Cole sua chave sk-proj-... do painel OpenAI</span>
              <input name="openaiApiKey" type="password" placeholder="sk-proj-..." autocomplete="new-password" />
            </label>
            <label class="field" style="margin-top:16px">
              Modelo
              <input name="openaiModel" value="${escapeHtml(input.model)}" placeholder="gpt-4o-mini" />
            </label>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:24px">Salvar configurações</button>
          </form>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${icons.lock} Segurança</h3></div>
        <div class="panel-body">
          <ul class="info-list">
            <li>O painel exige login com <code>PANEL_PASSWORD</code> no Railway.</li>
            <li>Ninguém acessa bots, prompts ou chaves sem autenticar.</li>
            <li>A API Key fica criptografada no servidor após salvar.</li>
            <li>Você também pode definir <code>OPENAI_API_KEY</code> direto no Railway.</li>
            <li><strong>Produção:</strong> adicione PostgreSQL no Railway e vincule <code>DATABASE_URL</code> — sem isso, dados somem a cada deploy.</li>
          </ul>
        </div>
      </div>
    </section>`;

  return layout("Configurações", body, "settings");
}
