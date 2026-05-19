import { globalStyles } from "./styles.js";
import { icons } from "./icons.js";

export type NavId = "dashboard" | "instances" | "settings" | "new";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const formScript = `
<script>
document.querySelectorAll("form").forEach((f) => {
  f.addEventListener("submit", () => {
    const b = f.querySelector('button[type="submit"]');
    if (b) { b.disabled = true; b.textContent = "Salvando..."; }
  });
});
</script>`;

function navItem(href: string, label: string, icon: string, active: boolean, disabled = false) {
  const cls = disabled ? "disabled" : active ? "active" : "";
  if (disabled) {
    return `<span class="${cls}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;opacity:0.4">${icon} ${label}</span>`;
  }
  return `<a href="${href}" class="${cls}">${icon} ${label}</a>`;
}

export function appLayout(title: string, active: NavId, body: string) {
  const dashActive = active === "dashboard";
  const instActive = active === "instances" || active === "new";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · BotManager</title>
  <style>${globalStyles}</style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="logo">BM</div>
        BotManager
      </div>
      <a href="/instances/new" class="btn-new">${icons.plus} Nova Instância</a>
      <nav class="nav">
        <div class="nav-section">
          ${navItem("/", "Dashboard", icons.dashboard, dashActive)}
          ${navItem("/instances", "Instâncias", icons.layers, instActive && active !== "new")}
          ${navItem("#", "Leads", icons.users, false, true)}
          ${navItem("#", "Conversas", icons.chat, false, true)}
          ${navItem("#", "Pagamentos", icons.card, false, true)}
          ${navItem("#", "Produtos", icons.box, false, true)}
          ${navItem("#", "Mídias", icons.image, false, true)}
          ${navItem("/settings", "Configurações", icons.settings, active === "settings")}
        </div>
        <div class="nav-section">
          <div class="nav-label">Ajuda</div>
          ${navItem("#", "Documentação", icons.doc, false, true)}
          ${navItem("#", "Suporte", icons.help, false, true)}
        </div>
      </nav>
      <div class="sidebar-plan">
        <strong>Seu Plano: Pro</strong>
        <span>Gerencie bots ilimitados com IA</span>
        <a href="/settings">Ver configurações</a>
      </div>
      <form method="post" action="/logout" style="margin-top:12px">
        <button type="submit" class="nav-btn" style="width:100%">${icons.logout} Sair</button>
      </form>
    </aside>
    <div class="main-wrap">
      <header class="topbar">
        <div class="topbar-left">
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="topbar-right">
          <button type="button" class="icon-btn" title="Notificações">${icons.bell}</button>
          <div class="user-pill">
            <div class="user-avatar">KS</div>
            <div>
              <div class="name">Kauan Store</div>
              <div class="role">Administrador</div>
            </div>
          </div>
        </div>
      </header>
      <main class="content">${body}</main>
      <footer class="footer">© 2026 BotManager. Todos os direitos reservados.</footer>
    </div>
  </div>
${formScript}
</body>
</html>`.replaceAll("<div", "<div").replaceAll("</div>", "</div>");
}

export function alertHtml(message: string, type: "success" | "error" = "success") {
  const cls = type === "error" ? "alert-error" : "alert-success";
  return `<div class="alert ${cls}">${escapeHtml(message)}</div>`;
}

export function botInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function botHandle(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return `@${slug || "bot"}_bot`;
}
