import type { BotConfig } from "../bots.js";
import type { ActivityItem, BotSalesRank } from "../db/events.js";
import { botInstanceForm, instancesTableHtml } from "./bot-form.js";
import { icons } from "./icons.js";
import { alertHtml, appLayout, escapeHtml } from "./layout.js";
import { brandMarkHtml } from "./brand.js";
import { salesChartSvgFromData } from "./pages.js";
import { globalStyles } from "./styles.js";

export type DashboardData = {
  stats: {
    leads: number;
    salesTotalCents: number;
    salesCount: number;
    messagesToday: number;
  };
  chart: { day: string; totalCents: number }[];
  activities: ActivityItem[];
  topBots: BotSalesRank[];
};

export function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function moneyBrl(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function activityFeedHtml(activities: ActivityItem[]) {
  if (activities.length === 0) {
    return `<div class="empty" style="padding:20px 8px;font-size:0.85rem">
      Nenhuma atividade registrada ainda.<br/>
      <small style="color:var(--muted)">Vendas, leads e pagamentos aparecem aqui automaticamente.</small>
    </div>`;
  }

  const iconMap = {
    sale: { cls: "sale", icon: icons.sparkles },
    lead: { cls: "lead", icon: icons.users },
    receipt: { cls: "pay", icon: icons.card }
  } as const;

  return activities
    .map((item) => {
      const meta = iconMap[item.type];
      return `<div class="activity-item">
      <div class="activity-icon ${meta.cls}">${meta.icon}</div>
      <div class="activity-text"><strong>${escapeHtml(item.title)}</strong><br/>${escapeHtml(item.subtitle)}</div>
      <div class="activity-time">${formatRelativeTime(item.at)}</div>
    </div>`;
    })
    .join("");
}

export function topBotsRankingHtml(ranking: BotSalesRank[]) {
  if (ranking.length === 0) {
    return `<div class="empty" style="padding:20px 8px;font-size:0.85rem">
      Nenhuma venda por instância ainda.<br/>
      <small style="color:var(--muted)">O ranking aparece quando a primeira venda for confirmada.</small>
    </div>`;
  }

  const maxTotal = Math.max(...ranking.map((r) => r.totalCents), 1);
  const grandTotal = ranking.reduce((s, r) => s + r.totalCents, 0);

  return ranking
    .map((bot, i) => {
      const pct = Math.round((bot.totalCents / maxTotal) * 100);
      const share = grandTotal > 0 ? Math.round((bot.totalCents / grandTotal) * 100) : 0;
      const rankCls = i === 0 ? "rank-gold" : i === 1 ? "rank-silver" : i === 2 ? "rank-bronze" : "";
      return `<div class="rank-row">
      <div class="rank-header">
        <span class="product-rank ${rankCls}">${i + 1}</span>
        <div class="rank-info">
          <span class="rank-name">${escapeHtml(bot.name)}</span>
          <span class="rank-meta">${bot.salesCount} venda(s) · ${share}% do faturamento</span>
        </div>
        <span class="product-price">${moneyBrl(bot.totalCents)}</span>
      </div>
      <div class="rank-bar"><span style="width:${pct}%"></span></div>
    </div>`;
    })
    .join("");
}

function activityFeed(activities: ActivityItem[]) {
  return activityFeedHtml(activities);
}

function topProducts(ranking: BotSalesRank[]) {
  return topBotsRankingHtml(ranking);
}

export function loginPage(message = "") {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login · BotManager</title>
  <style>${globalStyles}</style>
</head>
<body>
  <div class="ambient" aria-hidden="true"></div>
  <div class="login-page">
    <div class="login-hero">
      ${brandMarkHtml("Painel Telegram")}
      <h1><span class="brand-accent">Bots</span> que vendem no automático</h1>
      <p style="color:var(--text-2);line-height:1.65;max-width:440px">
        IA humanizada, áudios por gatilho, Pix, comprovantes e remarketing personalizado — tudo no estilo profissional de gestor de bots.
      </p>
      <div class="login-pills">
        <span class="login-pill">Áudios inteligentes</span>
        <span class="login-pill">Remarketing 1:1</span>
        <span class="login-pill">Pix + IA</span>
      </div>
    </div>
    <div class="login-form">
      <div class="login-box">
        <h2>Bem-vindo de volta</h2>
        <p style="color:var(--muted);margin-bottom:24px">Entre na sua conta BotManager</p>
        ${message ? alertHtml(message, "error") : ""}
        <form method="post" action="/login">
          <label class="field">E-mail
            <input name="email" type="email" placeholder="voce@email.com" required autofocus />
          </label>
          <label class="field">Senha
            <input name="password" type="password" placeholder="••••••••" required />
          </label>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Entrar no painel</button>
        </form>
        <p style="margin-top:16px;text-align:center;font-size:0.85rem;color:var(--muted)">
          Nao tem conta? <a href="/register" style="color:var(--primary)">Criar conta</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function dashboardPage(
  bots: BotConfig[],
  data: DashboardData,
  message = "",
  isError = false,
  partial = false,
  userName = "Usuario"
) {
  const active = bots.filter((b) => b.active).length;
  const previews = bots.reduce((s, b) => s + b.previewMediaUrls.length, 0);
  const salesReais = (data.stats.salesTotalCents / 100).toFixed(2).replace(".", ",");

  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon purple">${icons.layers}</div>
        <div>
          <div class="stat-label">Instâncias Ativas</div>
          <div class="stat-value">${active}</div>
          <div class="stat-delta">${bots.length} cadastrada(s)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">${icons.users}</div>
        <div>
          <div class="stat-label">Leads</div>
          <div class="stat-value" data-live-stat="leads">${data.stats.leads}</div>
          <div class="stat-delta" data-live-stat="messagesToday">${data.stats.messagesToday} msgs hoje</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">${icons.card}</div>
        <div>
          <div class="stat-label">Vendas</div>
          <div class="stat-value" data-live-stat="salesValue">R$ ${salesReais}</div>
          <div class="stat-delta" data-live-stat="salesCount">${data.stats.salesCount} venda(s)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">${icons.chat}</div>
        <div>
          <div class="stat-label">Mídias</div>
          <div class="stat-value">${previews}</div>
          <div class="stat-delta">prévias configuradas</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card card--table">
        <div class="card-head">
          <h3>Suas Instâncias</h3>
          <form method="post" action="/restart" style="display:inline">
            <button type="submit" class="btn btn-secondary btn-sm">${icons.refresh} Reiniciar</button>
          </form>
        </div>
        <div class="card-body card-body--flush">${instancesTableHtml(bots)}</div>
        <div class="card-foot">
          <a href="/instances" class="card-link">Ver todas as instâncias →</a>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Atividades Recentes</h3></div>
        <div class="card-body" data-live="activity-feed">${activityFeed(data.activities)}</div>
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-head"><h3>Configuração Rápida</h3></div>
        <div class="card-body">
          <div class="quick-grid">
            <a href="/instances/new" class="quick-item">${icons.sparkles} Prompt da IA</a>
            <a href="/instances/new" class="quick-item">${icons.pix} Chave Pix</a>
            <a href="/instances/new" class="quick-item">${icons.box} Mídias</a>
            <a href="/settings" class="quick-item">${icons.settings} OpenAI Key</a>
            <a href="/instances/new" class="quick-item">${icons.upload} Upload</a>
            <a href="/settings" class="quick-item">${icons.lock} Segurança</a>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Vendas — Últimos 7 dias</h3></div>
        <div class="card-body chart-wrap" data-live="sales-chart">${salesChartSvgFromData(data.chart)}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Top Instâncias</h3></div>
        <div class="card-body" data-live="top-bots">${topProducts(data.topBots)}</div>
      </div>
    </div>`;

  return appLayout("Dashboard", "dashboard", body, partial, userName);
}

export function instancesPage(
  bots: BotConfig[],
  message = "",
  isError = false,
  partial = false,
  userName = "Usuario"
) {
  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="card card--table" style="margin-bottom:16px">
      <div class="card-head"><h3>Todas as Instâncias (${bots.length})</h3>
        <a href="/instances/new" class="btn btn-primary btn-sm">${icons.plus} Nova</a>
      </div>
      <div class="card-body card-body--flush">${instancesTableHtml(bots)}</div>
    </div>`;

  return appLayout("Instâncias", "instances", body, partial, userName);
}

export function newInstancePage(
  message = "",
  isError = false,
  partial = false,
  userName = "Usuario"
) {
  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="card" style="max-width:900px">
      <div class="card-head">
        <h3>Nova Instância</h3>
        <a href="/instances" class="card-link">← Voltar às instâncias</a>
      </div>
      <div class="card-body">${botInstanceForm("new")}</div>
    </div>`;

  return appLayout("Nova Instância", "new", body, partial, userName);
}

export function editInstancePage(
  bot: BotConfig,
  message = "",
  isError = false,
  partial = false,
  userName = "Usuario"
) {
  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="card" style="max-width:900px">
      <div class="card-head">
        <h3>Editar — ${escapeHtml(bot.name)}</h3>
        <a href="/instances" class="card-link">← Voltar às instâncias</a>
      </div>
      <div class="card-body">${botInstanceForm("edit", bot)}</div>
    </div>`;

  return appLayout(`Editar ${bot.name}`, "instances", body, partial, userName);
}

export function registerPage(message = "") {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Criar conta · BotManager</title>
  <style>${globalStyles}</style>
</head>
<body>
  <div class="login-page">
    <div class="login-hero">
      <div class="sidebar-brand" style="padding:0 0 24px"><div class="logo">BM</div> BotManager</div>
      <h1>Seu painel de bots com IA</h1>
      <p style="color:var(--text-2);line-height:1.6;max-width:420px">Crie sua conta e gerencie bots Telegram com Pix e entrega automática.</p>
    </div>
    <div class="login-form">
      <div class="login-box">
        <h2>Criar conta</h2>
        ${message ? alertHtml(message, "error") : ""}
        <form method="post" action="/register">
          <label class="field">Seu nome<input name="name" required /></label>
          <label class="field">E-mail<input name="email" type="email" required /></label>
          <label class="field">Senha<input name="password" type="password" minlength="6" required /></label>
          <button type="submit" class="btn btn-primary btn-block">Criar conta</button>
        </form>
        <p style="margin-top:16px;text-align:center;font-size:0.85rem;color:var(--muted)">
          Ja tem conta? <a href="/login" style="color:var(--primary)">Entrar</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function settingsPage(
  input: {
    message?: string;
    messageIsError?: boolean;
    maskedKey: string;
    configured: boolean;
    source: string;
    model: string;
  },
  partial = false,
  userName = "Usuario"
) {
  const statusClass = input.configured ? "badge-online" : "badge-paused";
  const statusText = input.configured ? `Conectado (${input.source})` : "Não configurado";

  const body = `
    ${input.message ? alertHtml(input.message, input.messageIsError ? "error" : "success") : ""}
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <h3>${icons.sparkles} OpenAI / ChatGPT</h3>
          <span class="badge ${statusClass}"><span class="badge-dot"></span> ${statusText}</span>
        </div>
        <div class="card-body">
          ${input.configured ? `<p style="font-family:var(--mono);font-size:0.88rem;color:var(--primary);margin-bottom:16px;padding:12px;background:#0a0c12;border-radius:10px;border:1px solid var(--border)">${escapeHtml(input.maskedKey)}</p>` : ""}
          <form method="post" action="/settings">
            <label class="field">API Key OpenAI
              <input name="openaiApiKey" type="password" placeholder="sk-proj-..." autocomplete="new-password" />
            </label>
            <label class="field">Modelo
              <input name="openaiModel" value="${escapeHtml(input.model)}" placeholder="gpt-4o-mini" />
            </label>
            <button type="submit" class="btn btn-primary btn-block">Salvar configurações</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>${icons.lock} Segurança & Infra</h3></div>
        <div class="card-body" style="color:var(--text-2);line-height:1.7;font-size:0.9rem">
          <p style="margin-bottom:12px">Senha do painel via <code style="background:#0a0c12;padding:2px 6px;border-radius:4px">PANEL_PASSWORD</code> no Railway.</p>
          <p style="margin-bottom:12px">API Key criptografada no PostgreSQL após salvar.</p>
          <p>Use <code style="background:#0a0c12;padding:2px 6px;border-radius:4px">DATABASE_PUBLIC_URL</code> ou <code style="background:#0a0c12;padding:2px 6px;border-radius:4px">DATABASE_URL</code> para persistir dados.</p>
        </div>
      </div>
    </div>`;

  return appLayout("Configurações", "settings", body, partial, userName);
}
