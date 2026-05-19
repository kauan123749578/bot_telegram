import type { BotConfig } from "../bots.js";
import type { ActivityItem, BotSalesRank } from "../db/events.js";
import { icons } from "./icons.js";
import { alertHtml, appLayout, botHandle, botInitials, escapeHtml } from "./layout.js";
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

function botAvatar(bot: BotConfig) {
  if (bot.avatarUrl) {
    return `<div class="bot-av has-photo" style="background-image:url('${escapeHtml(bot.avatarUrl)}')"></div>`;
  }
  return `<div class="bot-av">${botInitials(bot.name)}</div>`;
}

function instancesTable(bots: BotConfig[]) {
  if (bots.length === 0) {
    return `<div class="empty">Nenhuma instância ainda. <a href="/instances/new" style="color:var(--primary)">Criar primeira instância</a></div>`;
  }

  return `<table class="table">
    <thead><tr>
      <th>Bot</th><th>Status</th><th>Leads</th><th>Prévias</th><th>Entregas</th><th></th>
    </tr></thead>
    <tbody>
    ${bots
      .map(
        (bot) => `
      <tr>
        <td>
          <div class="bot-cell">
            ${botAvatar(bot)}
            <div>
              <div class="title">${escapeHtml(bot.name)}</div>
              <div class="sub">${escapeHtml(botHandle(bot.name))}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${bot.active ? "badge-online" : "badge-paused"}">
            <span class="badge-dot"></span>
            ${bot.active ? "Online" : "Pausado"}
          </span>
        </td>
        <td><span class="metric">—</span></td>
        <td><span class="metric">${bot.previewMediaUrls.length}</span></td>
        <td><span class="metric">${bot.deliveryMediaUrls.length}</span></td>
        <td>
          <div class="row-actions">
            <form method="post" action="/bots/${bot.id}/toggle">
              <button type="submit" class="btn btn-secondary" style="padding:6px 10px;font-size:0.72rem">
                ${bot.active ? "Pausar" : "Ativar"}
              </button>
            </form>
            <form method="post" action="/bots/${bot.id}/delete" onsubmit="return confirm('Remover esta instância?')">
              <button type="submit" class="btn-icon danger" title="Remover">${icons.trash}</button>
            </form>
          </div>
        </td>
      </tr>`
      )
      .join("")}
    </tbody>
  </table>`;
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
  <div class="login-page">
    <div class="login-hero">
      <div class="sidebar-brand" style="padding:0 0 24px">
        <div class="logo">BM</div> BotManager
      </div>
      <h1>Gerencie bots que vendem no automático</h1>
      <p style="color:var(--text-2);line-height:1.6;max-width:420px">
        IA, Pix, comprovantes, prévias e entrega automática — painel profissional para suas instâncias Telegram.
      </p>
    </div>
    <div class="login-form">
      <div class="login-box">
        <h2>Bem-vindo de volta</h2>
        <p style="color:var(--muted);margin-bottom:24px">Cada cliente tem login e painel separado.</p>
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
</html>`.replaceAll("<div", "<div").replaceAll("</div>", "</div>");
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
      <div class="card">
        <div class="card-head">
          <h3>Suas Instâncias</h3>
          <form method="post" action="/restart" style="display:inline">
            <button type="submit" class="btn btn-secondary" style="padding:8px 14px;font-size:0.8rem">${icons.refresh} Reiniciar</button>
          </form>
        </div>
        <div class="card-body" style="padding:0">${instancesTable(bots)}</div>
        <div style="padding:12px 20px;border-top:1px solid var(--border)">
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
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h3>Todas as Instâncias (${bots.length})</h3>
        <a href="/instances/new" class="btn btn-primary" style="padding:8px 16px;font-size:0.82rem">${icons.plus} Nova</a>
      </div>
      <div class="card-body" style="padding:0">${instancesTable(bots)}</div>
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
        <a href="/" class="card-link">← Voltar ao dashboard</a>
      </div>
      <div class="card-body">
        <form method="post" action="/bots" enctype="multipart/form-data">
          <div class="form-grid">
            <label class="field">Nome da instância
              <input name="name" placeholder="Ex: MorenaVIP" required />
            </label>
            <label class="field">Status
              <select name="active"><option value="true">Online</option><option value="false">Pausado</option></select>
            </label>
            <label class="field span-2">Token Telegram
              <input name="token" placeholder="123456789:ABC..." required autocomplete="off" />
            </label>
            <label class="field span-2">Foto de perfil do bot
              <div class="dropzone">
                <p style="color:var(--muted);margin-bottom:8px">${icons.upload} Imagem quadrada (JPG/PNG)</p>
                <input name="avatarFile" type="file" accept="image/*" />
              </div>
            </label>
            <label class="field">Chave Pix
              <input name="pixKey" placeholder="CPF, email ou telefone" required />
            </label>
            <label class="field">Nome do recebedor Pix
              <input name="pixRecipientName" placeholder="Nome que aparece no comprovante" />
            </label>
            <label class="field">Delay resposta (ms)
              <input name="messageDelayMs" type="number" value="2500" min="800" />
            </label>
            <label class="field span-2" id="prompt">Prompt / persona da IA
              <textarea name="prompt" required>Voce atende leads no Telegram de forma simpatica, curta e persuasiva. Quando pedirem previa, ofereca. Quando pedirem Pix, informe a chave.</textarea>
            </label>
            <label class="field span-2" id="midias">
              <span>Prévias (upload)</span>
              <div class="dropzone">
                <p style="color:var(--muted);margin-bottom:8px">${icons.upload} Imagens, vídeos ou áudios</p>
                <input name="previewFiles" type="file" accept="image/*,video/*,audio/*" multiple />
              </div>
            </label>
            <label class="field span-2">
              <span>Entregas após pagamento</span>
              <div class="dropzone">
                <p style="color:var(--muted);margin-bottom:8px">${icons.upload} Arquivos liberados após Pix aprovado</p>
                <input name="deliveryFiles" type="file" accept="image/*,video/*,audio/*,application/pdf" multiple />
              </div>
            </label>
            <label class="field">Forma de pagamento
              <select name="paymentMethod">
                <option value="pix">Pix manual (chave)</option>
                <option value="laranjinha">Gateway Laranjinha</option>
              </select>
            </label>
            <label class="field">API Key Laranjinha <small style="color:var(--muted)">se gateway</small>
              <input name="laranjinhaApiKey" type="password" placeholder="sua chave API" autocomplete="off" />
            </label>
            <label class="field">Produto / plano<input name="productName" value="VIP Gold" required /></label>
            <label class="field">Preço (R$)<input name="productPrice" type="number" step="0.01" min="1" value="97" required /></label>
            <label class="field span-2">Link do grupo Telegram (entrega após pagamento)
              <input name="telegramGroupLink" placeholder="https://t.me/+seu_grupo_vip" />
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Salvar e ativar instância</button>
        </form>
      </div>
    </div>`;

  return appLayout("Nova Instância", "new", body, partial, userName);
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
