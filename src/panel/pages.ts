import type { BotConfig } from "../bots.js";
import { alertHtml, appLayout, escapeHtml, type NavId } from "./layout.js";
import { icons } from "./icons.js";

function wrap(title: string, nav: NavId, body: string, partial?: boolean) {
  if (partial) return `${body}`;
  return appLayout(title, nav, body);
}

function formatMoney(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function leadsPage(rows: Record<string, unknown>[], partial?: boolean) {
  const list =
    rows.length === 0
      ? `<div class="empty">Nenhum lead ainda. Quando alguem falar com o bot, aparece aqui.</div>`
      : `<table class="table"><thead><tr><th>Lead</th><th>Bot</th><th>Chat ID</th><th>Ultima msg</th></tr></thead><tbody>
      ${rows
        .map(
          (r) => `<tr>
          <td><strong>${escapeHtml(String(r.display_name || r.username || "Lead"))}</strong><br/><span style="color:var(--muted);font-size:0.8rem">@${escapeHtml(String(r.username || "—"))}</span></td>
          <td>${escapeHtml(String(r.bot_name || "—"))}</td>
          <td><code>${r.chat_id}</code></td>
          <td>${formatDate(String(r.last_message_at || r.lastMessageAt))}</td>
        </tr>`
        )
        .join("")}
      </tbody></table>`;

  const body = `<div class="card"><div class="card-head"><h3>${icons.users} Leads (${rows.length})</h3></div><div class="card-body" style="padding:0">${list}</div></div>`;
  return wrap("Leads", "leads", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"), partial);
}

export function conversationsPage(rows: Record<string, unknown>[], partial?: boolean) {
  const list =
    rows.length === 0
      ? `<div class="empty">Nenhuma conversa registrada ainda.</div>`
      : rows
          .map((m) => {
            const role = String(m.role);
            const cls = role === "user" ? "activity-icon lead" : "activity-icon sale";
            return `<div class="activity-item">
              <div class="${cls}">${role === "user" ? icons.users : icons.sparkles}</div>
              <div class="activity-text">
                <strong>${escapeHtml(String(m.bot_name || "Bot"))}</strong> · chat ${m.chat_id}<br/>
                <span style="color:var(--muted)">${role === "user" ? "Lead" : "Bot"}:</span> ${escapeHtml(String(m.content).slice(0, 200))}
              </div>
              <div class="activity-time">${formatDate(String(m.created_at || m.createdAt))}</div>
            </div>`;
          })
          .join("");

  const body = `<div class="card"><div class="card-head"><h3>${icons.chat} Conversas</h3></div><div class="card-body">${list}</div></div>`;
  return wrap("Conversas", "conversations", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"), partial);
}

export function paymentsPage(rows: Record<string, unknown>[], partial?: boolean) {
  const list =
    rows.length === 0
      ? `<div class="empty">Nenhum comprovante enviado ainda.</div>`
      : `<table class="table"><thead><tr><th>Status</th><th>Bot</th><th>Confianca</th><th>Motivo</th><th>Data</th></tr></thead><tbody>
      ${rows
        .map((r) => {
          const paid = Boolean(r.paid);
          return `<tr>
            <td><span class="badge ${paid ? "badge-online" : "badge-paused"}">${paid ? "Aprovado" : "Revisao"}</span></td>
            <td>${escapeHtml(String(r.bot_name || "—"))}</td>
            <td>${Math.round(Number(r.confidence || 0) * 100)}%</td>
            <td style="max-width:280px;font-size:0.85rem">${escapeHtml(String(r.reason || "").slice(0, 120))}</td>
            <td>${formatDate(String(r.created_at || r.createdAt))}</td>
          </tr>`;
        })
        .join("")}
      </tbody></table>`;

  const body = `<div class="card"><div class="card-head"><h3>${icons.card} Comprovantes / Pagamentos</h3></div><div class="card-body" style="padding:0">${list}</div></div>`;
  return wrap("Pagamentos", "payments", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"), partial);
}

export function productsPage(
  bots: BotConfig[],
  products: Record<string, unknown>[],
  message?: string,
  partial?: boolean
) {
  const body = `
    ${message ? alertHtml(message) : ""}
    <div class="card card-accent-gold" style="margin-bottom:16px">
      <div class="card-body" style="font-size:0.88rem;color:var(--text-2);line-height:1.6">
        <strong>O que é Produtos?</strong> Catálogo extra por instância (nome + preço) para você organizar planos no painel.
        O preço que o bot cobra no Pix hoje vem da instância em <em>Editar instância → Produto / plano</em>.
        Use esta tela quando tiver vários produtos no mesmo bot.
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h3>Novo produto</h3></div>
        <div class="card-body">
          <form method="post" action="/products">
            <label class="field">Instância<select name="botId" required>
              ${bots.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("")}
            </select></label>
            <label class="field">Nome<input name="name" placeholder="VIP Gold" required /></label>
            <label class="field">Preço (R$)<input name="price" type="number" step="0.01" min="1" placeholder="97.00" required /></label>
            <button type="submit" class="btn btn-primary btn-block">Salvar produto</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Produtos (${products.length})</h3></div>
        <div class="card-body" style="padding:0">
          ${
            products.length === 0
              ? `<div class="empty">Cadastre produtos por instância.</div>`
              : `<table class="table"><thead><tr><th>Produto</th><th>Bot</th><th>Preço</th></tr></thead><tbody>
              ${products
                .map(
                  (p) => `<tr>
                  <td><strong>${escapeHtml(String(p.name))}</strong></td>
                  <td>${escapeHtml(String(p.bot_name || "—"))}</td>
                  <td class="product-price">${formatMoney(Number(p.price_cents || p.priceCents))}</td>
                </tr>`
                )
                .join("")}
              </tbody></table>`
          }
        </div>
      </div>
    </div>`;

  return wrap("Produtos", "products", body, partial);
}

export function remarketingPage(
  bots: BotConfig[],
  selectedBotId: string,
  leads: { chatId: number; username?: string; displayName?: string }[],
  message = "",
  isError = false,
  partial?: boolean
) {
  const botOptions =
    bots.length === 0
      ? `<option value="">Cadastre uma instância primeiro</option>`
      : bots
          .map(
            (b) =>
              `<option value="${b.id}" ${b.id === selectedBotId ? "selected" : ""}>${escapeHtml(b.name)}</option>`
          )
          .join("");

  const leadRows =
    leads.length === 0
      ? `<tr><td colspan="3" class="empty-cell">Nenhum lead nesta instância ainda. Quando alguém falar com o bot, aparece aqui.</td></tr>`
      : leads
          .map((lead) => {
            const name = lead.displayName || lead.username || `Chat ${lead.chatId}`;
            const handle = lead.username ? `@${lead.username}` : `ID ${lead.chatId}`;
            return `<tr>
            <td><strong>${escapeHtml(name)}</strong><br/><span class="muted-sm">${escapeHtml(handle)}</span></td>
            <td><code>${lead.chatId}</code></td>
            <td>
              <textarea name="msg_${lead.chatId}" rows="2" class="remarketing-msg"
                placeholder="Mensagem só para ${escapeHtml(name)}..."></textarea>
            </td>
          </tr>`;
          })
          .join("");

  const body = `
    ${message ? alertHtml(message, isError ? "error" : "success") : ""}
    <div class="page-hero neon-hero">
      <div>
        <h2 class="hero-title"><span class="brand-accent">Remarketing</span> personalizado</h2>
        <p class="hero-desc">Cada lead recebe uma mensagem <strong>diferente</strong>. Deixe em branco quem não deve receber nada.</p>
      </div>
    </div>
    <form method="post" action="/remarketing" class="card card-neon">
      <div class="card-head"><h3>${icons.megaphone} Campanha por lead</h3></div>
      <div class="card-body">
        <label class="field">Instância
          <select name="botId" required onchange="location.href='/remarketing?botId='+this.value">
            ${botOptions}
          </select>
        </label>
        <div class="table-scroll remarketing-table-wrap" role="region">
          <table class="table remarketing-table">
            <thead><tr><th>Lead</th><th>Chat</th><th>Sua mensagem</th></tr></thead>
            <tbody>${leadRows}</tbody>
          </table>
        </div>
        <p class="form-hint">Pausa humana entre cada envio (delay da instância). Só leads com texto preenchido recebem mensagem.</p>
        <button type="submit" class="btn btn-primary btn-block" ${bots.length === 0 || leads.length === 0 ? "disabled" : ""}>
          Enviar remarketing
        </button>
      </div>
    </form>`;

  return wrap("Remarketing", "remarketing", body, partial);
}

export function mediaPage(bots: BotConfig[], partial?: boolean) {
  const items: { bot: string; type: string; url: string }[] = [];
  for (const bot of bots) {
    for (const url of bot.previewMediaUrls) {
      items.push({ bot: bot.name, type: "Prévia", url });
    }
    for (const url of bot.deliveryMediaUrls) {
      items.push({ bot: bot.name, type: "Entrega", url });
    }
    for (const audio of bot.audioLibrary ?? []) {
      items.push({ bot: bot.name, type: `Áudio: ${audio.label}`, url: audio.url });
    }
  }

  const list =
    items.length === 0
      ? `<div class="empty">Nenhuma midia enviada. Use upload em Nova Instância.</div>`
      : `<table class="table"><thead><tr><th>Bot</th><th>Tipo</th><th>Arquivo</th></tr></thead><tbody>
      ${items
        .map(
          (i) => `<tr>
          <td>${escapeHtml(i.bot)}</td>
          <td><span class="badge badge-online">${i.type}</span></td>
          <td><a href="${escapeHtml(i.url)}" target="_blank" style="color:var(--primary)">${escapeHtml(i.url)}</a></td>
        </tr>`
        )
        .join("")}
      </tbody></table>`;

  const body = `<div class="card"><div class="card-head"><h3>${icons.image} Midias (upload)</h3></div><div class="card-body" style="padding:0">${list}</div></div>`;
  return wrap("Mídias", "media", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>"), partial);
}

export function salesChartSvgFromData(points: { day: string; totalCents: number }[]) {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const values = days.map((day) => points.find((p) => p.day === day)?.totalCents ?? 0);
  const max = Math.max(...values, 1);
  const w = 400;
  const h = 140;
  const coords = values.map((v, i) => {
    const x = (i / 6) * w;
    const y = h - (v / max) * (h - 20);
    return `${x},${y}`;
  });
  const area = `M0,${h} ${coords.map((c, i) => `L${c.split(",")[0]},${c.split(",")[1]}`).join(" ")} L${w},${h} Z`;
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h + 20}" preserveAspectRatio="none">
    <path d="${area}" fill="rgba(42,171,238,0.2)"/>
    <polyline points="${coords.join(" ")}" fill="none" stroke="#2aabee" stroke-width="3" stroke-linecap="round"/>
  </svg>
  <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.72rem;color:var(--muted)">
    ${days.map((d) => `<span>${d.slice(5)}</span>`).join("")}
  </div>`;
}
