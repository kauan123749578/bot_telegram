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

  return wrap("Produtos", "products", body.replaceAll("<div", "<div").replaceAll("</div>", "</div>").replaceAll("<div", "<div").replaceAll("</div>", "</div>"), partial);
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
