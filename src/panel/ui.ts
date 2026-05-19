import type { BotConfig } from "../bots.js";
import { icons } from "./icons.js";
import { alertHtml, appLayout, botHandle, botInitials, escapeHtml } from "./layout.js";
import { globalStyles } from "./styles.js";

function salesChartSvg() {
  return `<svg class="chart-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(139,92,246,0.35)"/>
      <stop offset="100%" stop-color="rgba(139,92,246,0)"/>
    </linearGradient></defs>
    <path d="M0,120 L50,100 L100,110 L150,70 L200,85 L250,45 L300,60 L350,30 L400,50 L400,160 L0,160 Z" fill="url(#g)"/>
    <polyline points="0,120 50,100 100,110 150,70 200,85 250,45 300,60 350,30 400,50" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
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
            <div class="bot-av">${botInitials(bot.name)}</div>
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

function activityFeed(bots: BotConfig[]) {
  const name = bots[0]?.name || "Seu bot";
  return `
    <div class="activity-item">
      <div class="activity-icon pay">${icons.card}</div>
      <div class="activity-text"><strong>Pagamento aprovado</strong><br/>Lead pagou via Pix · ${escapeHtml(name)}</div>
      <div class="activity-time">agora</div>
    </div>
    <div class="activity-item">
      <div class="activity-icon lead">${icons.users}</div>
      <div class="activity-text"><strong>Novo lead</strong><br/>Conversa iniciada · ${escapeHtml(name)}</div>
      <div class="activity-time">2min</div>
    </div>
    <div class="activity-item">
      <div class="activity-icon sale">${icons.sparkles}</div>
      <div class="activity-text"><strong>Bot ativo</strong><br/>Instância respondendo com IA</div>
      <div class="activity-time">5min</div>
    </div>`;
}

function topProducts(bots: BotConfig[]) {
  const items =
    bots.length > 0
      ? bots.slice(0, 4).map((b, i) => ({
          name: b.name,
          price: `R$ ${(49.9 + i * 30).toFixed(2).replace(".", ",")}`
        }))
      : [
          { name: "VIP Gold", price: "R$ 97,00" },
          { name: "VIP Prata", price: "R$ 67,00" },
          { name: "Pack Fotos", price: "R$ 39,90" }
        ];

  return items
    .map(
      (p, i) => `
    <div class="product-row">
      <div class="product-left">
        <span class="product-rank">${i + 1}</span>
        <span>${escapeHtml(p.name)}</span>
      </div>
      <span class="product-price">${p.price}</span>
    </div>`
    )
    .join("");
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
        <p style="color:var(--muted);margin-bottom:24px">Entre com a senha do painel (Railway).</p>
        ${message ? alertHtml(message, "error") : ""}
        <form method="post" action="/login">
          <label class="field">Senha
            <input name="password" type="password" placeholder="••••••••" required autofocus />
          </label>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Entrar no painel</button>
        </form>
      </div>
    </div>
  </div>
</body>
</html>`.replaceAll("<div", "<div").replaceAll("</div>", "</div>");
}

export function dashboardPage(bots: BotConfig[], message = "", isError = false) {
  const active = bots.filter((b) => b.active).length;
  const previews = bots.reduce((s, b) => s + b.previewMediaUrls.length, 0);

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
          <div class="stat-value">—</div>
          <div class="stat-delta" style="color:var(--muted)">em breve</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">${icons.card}</div>
        <div>
          <div class="stat-label">Vendas</div>
          <div class="stat-value">R$ 0</div>
          <div class="stat-delta" style="color:var(--muted)">em breve</div>
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
        <div class="card-body">${activityFeed(bots)}</div>
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
        <div class="card-body chart-wrap">${salesChartSvg()}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Top Instâncias</h3></div>
        <div class="card-body">${topProducts(bots)}</div>
      </div>
    </div>`;

  return appLayout("Dashboard", "dashboard", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"));
}

export function instancesPage(bots: BotConfig[], message = "", isError = false) {
  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h3>Todas as Instâncias (${bots.length})</h3>
        <a href="/instances/new" class="btn btn-primary" style="padding:8px 16px;font-size:0.82rem">${icons.plus} Nova</a>
      </div>
      <div class="card-body" style="padding:0">${instancesTable(bots)}</div>
    </div>`;

  return appLayout("Instâncias", "instances", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"));
}

export function newInstancePage(message = "", isError = false) {
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
            <label class="field">Chave Pix
              <input name="pixKey" placeholder="CPF, email ou telefone" required />
            </label>
            <label class="field">Delay (ms)
              <input name="messageDelayMs" type="number" value="1500" min="0" />
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
            <label class="field span-2">Links prévia <small style="color:var(--muted)">opcional</small>
              <textarea name="previewMediaUrls" placeholder="https://..."></textarea>
            </label>
            <label class="field span-2">Links entrega <small style="color:var(--muted)">opcional</small>
              <textarea name="deliveryMediaUrls" placeholder="https://..."></textarea>
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Salvar e ativar instância</button>
        </form>
      </div>
    </div>`;

  return appLayout("Nova Instância", "new", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>").replaceAll("<div", "<div").replaceAll("</div>", "</div>"));
}

export function settingsPage(input: {
  message?: string;
  messageIsError?: boolean;
  maskedKey: string;
  configured: boolean;
  source: string;
  model: string;
}) {
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

  return appLayout("Configurações", "settings", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"));
}
