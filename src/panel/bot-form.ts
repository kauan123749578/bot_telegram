import type { BotConfig } from "../bots.js";
import { icons } from "./icons.js";
import { botHandle, botInitials, escapeHtml } from "./layout.js";

export function botAvatarHtml(bot: BotConfig) {
  if (bot.avatarUrl) {
    return `<div class="bot-av has-photo" style="background-image:url('${escapeHtml(bot.avatarUrl)}')"></div>`;
  }
  return `<div class="bot-av">${botInitials(bot.name)}</div>`;
}

function mediaChips(urls: string[], label: string) {
  if (urls.length === 0) return "";
  return `<p style="font-size:0.78rem;color:var(--muted);margin:8px 0 4px">${label} (${urls.length}):</p>
    <div class="media-preview-list">
      ${urls
        .map((url) => {
          const name = url.split("/").pop() || url;
          return `<span class="media-preview-chip">${escapeHtml(name)}</span>`;
        })
        .join("")}
    </div>
    <p style="font-size:0.72rem;color:var(--muted);margin-top:6px">Novos arquivos serão adicionados aos existentes.</p>`;
}

export function botInstanceForm(mode: "new" | "edit", bot?: BotConfig) {
  const isEdit = mode === "edit" && bot;
  const action = isEdit ? `/instances/${bot.id}` : "/bots";
  const price = isEdit ? (bot.productPriceCents / 100).toFixed(2) : "97";
  const activeTrue = !isEdit || bot.active;
  const paymentPix = !isEdit || bot.paymentMethod !== "laranjinha";

  return `
    <form method="post" action="${action}" enctype="multipart/form-data">
      <div class="form-grid">
        <label class="field">Nome da instância
          <input name="name" value="${isEdit ? escapeHtml(bot.name) : ""}" placeholder="Ex: MorenaVIP" required />
        </label>
        <label class="field">Status
          <select name="active">
            <option value="true" ${activeTrue ? "selected" : ""}>Online</option>
            <option value="false" ${!activeTrue ? "selected" : ""}>Pausado</option>
          </select>
        </label>
        <label class="field span-2">Token Telegram
          <input name="token" ${isEdit ? "" : "required"} autocomplete="off"
            placeholder="${isEdit ? "Deixe vazio para manter o token atual" : "123456789:ABC..."}" />
        </label>
        <label class="field span-2">Foto de perfil do bot
          <div class="dropzone">
            ${isEdit && bot.avatarUrl ? `<div style="margin-bottom:10px">${botAvatarHtml(bot)}</div>` : ""}
            <p style="color:var(--muted);margin-bottom:8px">${icons.upload} ${isEdit ? "Trocar foto (opcional)" : "Imagem quadrada (JPG/PNG)"}</p>
            <input name="avatarFile" type="file" accept="image/*" />
          </div>
        </label>
        <label class="field">Chave Pix
          <input name="pixKey" value="${isEdit ? escapeHtml(bot.pixKey) : ""}" placeholder="CPF, email ou telefone" required />
        </label>
        <label class="field">Nome do recebedor Pix
          <input name="pixRecipientName" value="${isEdit ? escapeHtml(bot.pixRecipientName) : ""}" placeholder="Nome no comprovante" />
        </label>
        <label class="field">Delay resposta (ms)
          <input name="messageDelayMs" type="number" value="${isEdit ? bot.messageDelayMs : 2500}" min="800" />
        </label>
        <label class="field span-2" id="prompt">Prompt / persona da IA
          <textarea name="prompt" required>${isEdit ? escapeHtml(bot.prompt) : "Voce atende leads no Telegram de forma simpatica, curta e persuasiva. Quando pedirem previa, ofereca. Quando pedirem Pix, informe a chave."}</textarea>
        </label>
        <label class="field span-2" id="midias">
          <span>Prévias (upload)</span>
          ${isEdit ? mediaChips(bot.previewMediaUrls, "Prévias atuais") : ""}
          <div class="dropzone">
            <p style="color:var(--muted);margin-bottom:8px">${icons.upload} ${isEdit ? "Adicionar mais prévias" : "Imagens, vídeos ou áudios"}</p>
            <input name="previewFiles" type="file" accept="image/*,video/*,audio/*" multiple />
          </div>
        </label>
        <label class="field span-2">
          <span>Entregas após pagamento</span>
          ${isEdit ? mediaChips(bot.deliveryMediaUrls, "Entregas atuais") : ""}
          <div class="dropzone">
            <p style="color:var(--muted);margin-bottom:8px">${icons.upload} ${isEdit ? "Adicionar mais entregas" : "Arquivos após Pix aprovado"}</p>
            <input name="deliveryFiles" type="file" accept="image/*,video/*,audio/*,application/pdf" multiple />
          </div>
        </label>
        <label class="field">Forma de pagamento
          <select name="paymentMethod">
            <option value="pix" ${paymentPix ? "selected" : ""}>Pix manual (chave)</option>
            <option value="laranjinha" ${!paymentPix ? "selected" : ""}>Gateway Laranjinha</option>
          </select>
        </label>
        <label class="field">API Key Laranjinha <small style="color:var(--muted)">se gateway</small>
          <input name="laranjinhaApiKey" type="password" placeholder="${isEdit ? "Deixe vazio para manter a atual" : "sua chave API"}" autocomplete="off" />
        </label>
        <label class="field">Produto / plano
          <input name="productName" value="${isEdit ? escapeHtml(bot.productName) : "VIP Gold"}" required />
        </label>
        <label class="field">Preço (R$)
          <input name="productPrice" type="number" step="0.01" min="1" value="${price}" required />
        </label>
        <label class="field span-2">Link do grupo Telegram (entrega após pagamento)
          <input name="telegramGroupLink" value="${isEdit ? escapeHtml(bot.telegramGroupLink) : ""}" placeholder="https://t.me/+seu_grupo_vip" />
        </label>
      </div>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px">
        ${isEdit ? "Salvar alterações" : "Salvar e ativar instância"}
      </button>
    </form>`;
}

export function instancesTableHtml(bots: BotConfig[]) {
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
            ${botAvatarHtml(bot)}
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
            <a href="/instances/${bot.id}/edit" class="btn btn-secondary" style="padding:6px 10px;font-size:0.72rem" title="Editar">${icons.edit} Editar</a>
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
