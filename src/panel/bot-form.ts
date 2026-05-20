import type { BotConfig } from "../bots.js";
import { icons } from "./icons.js";
import { botHandle, botInitials, escapeHtml } from "./layout.js";

function delayPartsFromMs(ms: number) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSec / 60),
    seconds: totalSec % 60
  };
}

function countAudioUrls(urls: string[]) {
  return urls.filter((u) => /\.(mp3|m4a|wav|ogg|opus)(\?.*)?$/i.test(u)).length;
}

export function botAvatarHtml(bot: BotConfig) {
  const initials = botInitials(bot.name);
  if (bot.avatarUrl) {
    const url = escapeHtml(bot.avatarUrl);
    return `<div class="bot-av-wrap">
      <img class="bot-av-img" src="${url}" alt="" loading="lazy"
        onerror="this.remove();this.parentElement.querySelector('.bot-av-fallback')?.classList.add('show')" />
      <div class="bot-av bot-av-fallback">${initials}</div>
    </div>`;
  }
  return `<div class="bot-av-wrap"><div class="bot-av bot-av-fallback show">${initials}</div></div>`;
}

function audioLibraryHtml(library: BotConfig["audioLibrary"]) {
  if (!library?.length) {
    return `<p class="form-hint">Nenhum áudio nomeado ainda. Ex: nome <strong>oi, tudo bem?</strong> → arquivo com essa fala.</p>`;
  }
  return `<ul class="audio-library-list">
    ${library
      .map(
        (item, i) => `
      <li>
        <span class="audio-library-label">${escapeHtml(item.label)}</span>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="card-link">ouvir</a>
        <label class="audio-remove"><input type="checkbox" name="removeAudioIndexes" value="${i}" /> remover</label>
      </li>`
      )
      .join("")}
  </ul>`;
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
  const delay = delayPartsFromMs(isEdit ? bot.messageDelayMs : 4000);
  const previewAudios = isEdit ? countAudioUrls(bot.previewMediaUrls) : 0;
  const deliveryAudios = isEdit ? countAudioUrls(bot.deliveryMediaUrls) : 0;

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
        <div class="form-section span-2">
          <div class="form-section-head">
            <span class="form-section-icon">${icons.chat}</span>
            <div>
              <h4>Comportamento humano</h4>
              <p>Pausa entre <strong>cada mensagem</strong> no Telegram (texto, áudio, foto).</p>
            </div>
          </div>
          <div class="delay-grid">
            <label class="field">
              Minutos
              <input name="messageDelayMinutes" type="number" min="0" max="30" value="${delay.minutes}" />
            </label>
            <label class="field">
              Segundos
              <input name="messageDelaySeconds" type="number" min="0" max="59" value="${delay.seconds}" />
            </label>
          </div>
          <p class="form-hint">Ex: 1 min + 30 seg = ~90s entre cada bolha. Comprovante usa pausa extra automática.</p>
        </div>

        <div class="form-section span-2 form-section-audio">
          <div class="form-section-head">
            <span class="form-section-icon form-section-icon-violet">${icons.audio}</span>
            <div>
              <h4>Biblioteca de áudios nomeados</h4>
              <p>O bot envia o arquivo quando o lead ou a IA usar as <strong>mesmas palavras</strong> do nome (ex: <em>oi, tudo bem?</em>).</p>
            </div>
          </div>
          ${audioLibraryHtml(isEdit ? bot.audioLibrary : [])}
          <div class="audio-add-grid">
            <label class="field">
              Nome do áudio (o que ele fala)
              <input name="newAudioLabel" placeholder='oi, tudo bem?' />
            </label>
            <label class="field">
              Palavras extras (opcional, vírgula)
              <input name="newAudioKeywords" placeholder="oi,ola,e ai" />
            </label>
          </div>
          <label class="field">
            Arquivo de áudio
            <div class="dropzone dropzone-audio">
              <p style="color:var(--muted);margin-bottom:8px">${icons.upload} MP3, M4A ou OGG (nota de voz)</p>
              <input name="newAudioFile" type="file" accept="audio/*,.ogg,.opus,audio/ogg" />
            </div>
          </label>
          ${isEdit ? `<p class="form-hint">Prévia: ${previewAudios} áudio(s) · Entrega: ${deliveryAudios} áudio(s) em mídias gerais</p>` : ""}
        </div>

        <label class="field span-2" id="prompt">Prompt / persona da IA
          <textarea name="prompt" required>${isEdit ? escapeHtml(bot.prompt) : "Voce atende leads no Telegram de forma simpatica, curta e persuasiva. Quando pedirem previa, ofereca. Quando pedirem Pix, informe a chave."}</textarea>
        </label>
        <label class="field span-2" id="midias">
          <span>Prévias (upload)</span>
          ${isEdit ? mediaChips(bot.previewMediaUrls, "Prévias atuais") : ""}
          <div class="dropzone">
            <p style="color:var(--muted);margin-bottom:8px">${icons.upload} ${isEdit ? "Adicionar mais prévias" : "Imagens, vídeos, áudios ou notas de voz (.ogg)"}</p>
            <input name="previewFiles" type="file" accept="image/*,video/*,audio/*,.ogg,.opus" multiple />
          </div>
        </label>
        <label class="field span-2">
          <span>Entregas após pagamento</span>
          ${isEdit ? mediaChips(bot.deliveryMediaUrls, "Entregas atuais") : ""}
          <div class="dropzone">
            <p style="color:var(--muted);margin-bottom:8px">${icons.upload} ${isEdit ? "Adicionar mais entregas" : "Arquivos após Pix aprovado"}</p>
            <input name="deliveryFiles" type="file" accept="image/*,video/*,audio/*,.ogg,.opus,application/pdf" multiple />
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

  return `<div class="table-scroll" role="region" aria-label="Lista de instâncias">
    <table class="table table-instances">
    <thead><tr>
      <th>Bot</th><th>Status</th><th>Leads</th><th>Prévias</th><th>Entregas</th>
      <th class="th-actions">Ações</th>
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
        <td class="td-actions">
          <div class="row-actions">
            <a href="/instances/${bot.id}/edit" class="action-btn" title="Editar configuração">
              <span class="action-btn__icon">${icons.edit}</span>
              <span class="action-btn__label">Editar</span>
            </a>
            <form method="post" action="/bots/${bot.id}/toggle">
              <button type="submit" class="action-btn action-btn--ghost" title="${bot.active ? "Pausar bot" : "Ativar bot"}">
                <span class="action-btn__label">${bot.active ? "Pausar" : "Ativar"}</span>
              </button>
            </form>
            <form method="post" action="/bots/${bot.id}/delete" onsubmit="return confirm('Remover esta instância?')">
              <button type="submit" class="action-btn action-btn--danger" title="Remover">${icons.trash}</button>
            </form>
          </div>
        </td>
      </tr>`
      )
      .join("")}
    </tbody>
    </table>
  </div>`;
}
