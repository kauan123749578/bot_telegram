import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import dotenv from "dotenv";
import Fastify from "fastify";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { Telegraf } from "telegraf";
import { z } from "zod";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, "..");
const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(dataDir, "uploads");
const botsFile = path.join(dataDir, "bots.json");

dotenv.config({ path: path.join(rootDir, ".env") });

const env = z
  .object({
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY e obrigatoria."),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    PANEL_PASSWORD: z.string().min(6).default("troque-essa-senha"),
    PORT: z.coerce.number().default(3000),
    TELEGRAM_BOT_TOKEN: z.string().default(""),
    BOT_NAME: z.string().default("Bot Principal"),
    BOT_PROMPT: z.string().default("Voce atende leads no Telegram de forma simpatica e objetiva."),
    PIX_KEY: z.string().default(""),
    MESSAGE_DELAY_MS: z.coerce.number().default(1500),
    PREVIEW_MEDIA_URLS: z.string().default(""),
    DELIVERY_MEDIA_URLS: z.string().default("")
  })
  .parse(process.env);

type BotConfig = {
  id: string;
  name: string;
  token: string;
  prompt: string;
  pixKey: string;
  messageDelayMs: number;
  previewMediaUrls: string[];
  deliveryMediaUrls: string[];
  active: boolean;
};

type RuntimeBot = {
  config: BotConfig;
  bot: Telegraf;
  historyByChat: Map<number, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>;
};

type ReceiptAnalysis = {
  paid: boolean;
  confidence: number;
  reason: string;
};

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const runningBots = new Map<string, RuntimeBot>();

function parseUrls(value: string) {
  return value
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUploadedMedia(value: string) {
  return value.startsWith("/uploads/");
}

function uploadPathFromUrl(value: string) {
  const fileName = path.basename(value);
  return path.join(uploadsDir, fileName);
}

function mimeTypeFromPath(value: string) {
  const ext = path.extname(value).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".wav") return "audio/wav";
  return "application/octet-stream";
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

function isAudioUrl(url: string) {
  return /\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(url);
}

function isPdfFile(fileName = "", mimeType = "") {
  return mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
}

function isImageFile(fileName = "", mimeType = "") {
  return mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileName);
}

async function downloadBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo do Telegram: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });

  try {
    await fs.access(botsFile);
  } catch {
    const seed: BotConfig[] = env.TELEGRAM_BOT_TOKEN
      ? [
          {
            id: randomUUID(),
            name: env.BOT_NAME,
            token: env.TELEGRAM_BOT_TOKEN,
            prompt: env.BOT_PROMPT,
            pixKey: env.PIX_KEY,
            messageDelayMs: env.MESSAGE_DELAY_MS,
            previewMediaUrls: parseUrls(env.PREVIEW_MEDIA_URLS),
            deliveryMediaUrls: parseUrls(env.DELIVERY_MEDIA_URLS),
            active: true
          }
        ]
      : [];

    await fs.writeFile(botsFile, JSON.stringify(seed, null, 2));
  }
}

async function loadBots() {
  await ensureDataFile();
  const raw = await fs.readFile(botsFile, "utf8");
  return JSON.parse(raw) as BotConfig[];
}

async function saveBots(bots: BotConfig[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(botsFile, JSON.stringify(bots, null, 2));
}

async function sendMediaList(bot: Telegraf, chatId: number, urls: string[]) {
  for (const url of urls) {
    const media = isUploadedMedia(url) ? { source: uploadPathFromUrl(url) } : url;

    if (isImageUrl(url)) {
      await bot.telegram.sendPhoto(chatId, media);
    } else if (isVideoUrl(url)) {
      await bot.telegram.sendVideo(chatId, media);
    } else if (isAudioUrl(url)) {
      await bot.telegram.sendAudio(chatId, media);
    } else {
      await bot.telegram.sendDocument(chatId, media);
    }
  }
}

async function saveUploadedFile(file: AsyncIterable<Buffer>, originalName: string) {
  await fs.mkdir(uploadsDir, { recursive: true });
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const filePath = path.join(uploadsDir, fileName);
  const chunks: Buffer[] = [];

  for await (const chunk of file) {
    chunks.push(chunk);
  }

  await fs.writeFile(filePath, Buffer.concat(chunks));
  return `/uploads/${fileName}`;
}

function wantsPreview(text: string) {
  return /previa|prévia|foto|video|vídeo|audio|áudio|amostra|ver antes/i.test(text);
}

function wantsPix(text: string) {
  return /pix|pagar|pagamento|valor|preco|preço|comprar|acesso|liberar/i.test(text);
}

function parseReceiptAnalysis(content: string): ReceiptAnalysis {
  const parsed = JSON.parse(content || "{}") as {
    paid?: boolean;
    confidence?: number;
    reason?: string;
  };

  return {
    paid: Boolean(parsed.paid && (parsed.confidence ?? 0) >= 0.65),
    confidence: parsed.confidence ?? 0,
    reason: parsed.reason || "Sem justificativa retornada pela IA."
  };
}

async function analyzeReceiptImage(input: {
  imageUrl: string;
  pixKey: string;
}): Promise<ReceiptAnalysis> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce analisa comprovantes Pix brasileiros. Responda apenas JSON valido com: paid boolean, confidence number de 0 a 1, reason string, detectedPixKey string|null, detectedAmount string|null, detectedDate string|null."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Verifique se esta imagem parece um comprovante Pix pago para a chave Pix: ${input.pixKey}. Aprove somente se houver sinais claros de pagamento concluido/efetivado.`
          },
          {
            type: "image_url",
            image_url: { url: input.imageUrl }
          }
        ]
      }
    ]
  });

  const content = completion.choices[0]?.message.content || "{}";
  return parseReceiptAnalysis(content);
}

async function analyzeReceiptText(input: {
  text: string;
  pixKey: string;
}): Promise<ReceiptAnalysis> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce analisa textos extraidos de comprovantes Pix brasileiros. Responda apenas JSON valido com: paid boolean, confidence number de 0 a 1, reason string, detectedPixKey string|null, detectedAmount string|null, detectedDate string|null."
      },
      {
        role: "user",
        content: `Verifique se este texto parece um comprovante Pix pago para a chave Pix: ${input.pixKey}. Aprove somente se houver sinais claros de pagamento concluido/efetivado.\n\nTEXTO DO PDF:\n${input.text.slice(0, 12000)}`
      }
    ]
  });

  const content = completion.choices[0]?.message.content || "{}";
  return parseReceiptAnalysis(content);
}

async function analyzeReceiptPdf(input: {
  pdfUrl: string;
  pixKey: string;
}): Promise<ReceiptAnalysis> {
  const buffer = await downloadBuffer(input.pdfUrl);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text.trim();

  if (!text) {
    return {
      paid: false,
      confidence: 0,
      reason: "Nao consegui extrair texto do PDF. Envie uma imagem nitida do comprovante ou um PDF pesquisavel."
    };
  }

  return analyzeReceiptText({
    text,
    pixKey: input.pixKey
  });
}

async function handleReceiptResult(input: {
  result: ReceiptAnalysis;
  chatId: number;
  reply: (message: string) => Promise<unknown>;
  bot: Telegraf;
  config: BotConfig;
}) {
  if (input.result.paid) {
    await input.reply(`Pagamento aprovado. Confiança: ${Math.round(input.result.confidence * 100)}%.`);
    await sleep(input.config.messageDelayMs);
    await sendMediaList(input.bot, input.chatId, input.config.deliveryMediaUrls);
    if (input.config.deliveryMediaUrls.length === 0) {
      await input.reply("Entrega liberada, mas ainda nao tem midia de entrega cadastrada no painel.");
    }
    return;
  }

  await input.reply(
    `Nao consegui aprovar automaticamente esse comprovante.\nMotivo: ${input.result.reason}\n\nVou deixar para revisao manual.`
  );
}

async function startBot(config: BotConfig) {
  if (!config.active || !config.token) {
    return;
  }

  const bot = new Telegraf(config.token);
  const runtime: RuntimeBot = {
    config,
    bot,
    historyByChat: new Map()
  };

  bot.start((ctx) => ctx.reply("Oi. Me manda uma mensagem que eu te atendo por aqui."));

  bot.command("pix", (ctx) => {
    return ctx.reply(`Chave Pix:\n${config.pixKey}\n\nDepois envie o comprovante aqui como imagem ou PDF.`);
  });

  bot.on("photo", async (ctx) => {
    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1];
    const fileUrl = await ctx.telegram.getFileLink(bestPhoto.file_id);

    await ctx.reply("Recebi seu comprovante. Vou conferir agora.");
    const result = await analyzeReceiptImage({
      imageUrl: fileUrl.href,
      pixKey: config.pixKey
    });

    await handleReceiptResult({
      result,
      chatId: ctx.chat.id,
      reply: ctx.reply.bind(ctx),
      bot,
      config
    });
  });

  bot.on("document", async (ctx) => {
    const document = ctx.message.document;
    const fileName = document.file_name || "";
    const mimeType = document.mime_type || "";
    const fileUrl = await ctx.telegram.getFileLink(document.file_id);

    if (!isPdfFile(fileName, mimeType) && !isImageFile(fileName, mimeType)) {
      await ctx.reply("Recebi o arquivo, mas para comprovante envie uma imagem ou PDF.");
      return;
    }

    await ctx.reply("Recebi seu comprovante. Vou conferir agora.");

    const result = isPdfFile(fileName, mimeType)
      ? await analyzeReceiptPdf({
          pdfUrl: fileUrl.href,
          pixKey: config.pixKey
        })
      : await analyzeReceiptImage({
          imageUrl: fileUrl.href,
          pixKey: config.pixKey
        });

    await handleReceiptResult({
      result,
      chatId: ctx.chat.id,
      reply: ctx.reply.bind(ctx),
      bot,
      config
    });
  });

  bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const history = runtime.historyByChat.get(chatId) || [];
    runtime.historyByChat.set(chatId, history);

    if (wantsPreview(text) && config.previewMediaUrls.length > 0) {
      await sleep(config.messageDelayMs);
      await ctx.reply("Vou te mandar uma previa.");
      await sendMediaList(bot, chatId, config.previewMediaUrls);
      return;
    }

    if (wantsPix(text)) {
      await sleep(config.messageDelayMs);
      await ctx.reply(`Chave Pix:\n${config.pixKey}\n\nDepois envie o comprovante aqui como imagem ou PDF.`);
    }

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `${config.prompt}\n\nChave Pix deste bot: ${config.pixKey}. Se o lead pedir previa, diga que voce pode enviar. Responda curto e natural.`
        },
        ...history.slice(-10),
        { role: "user", content: text }
      ]
    });

    const reply = completion.choices[0]?.message.content?.trim() || "Me chama de novo, por favor.";
    history.push({ role: "user", content: text }, { role: "assistant", content: reply });

    await sleep(config.messageDelayMs);
    await ctx.reply(reply);
  });

  bot.catch((error) => {
    console.error(`Erro no bot ${config.name}:`, error);
  });

  await bot.launch();
  runningBots.set(config.id, runtime);
  console.log(`Bot ativo: ${config.name}`);
}

async function restartBots() {
  for (const runtime of runningBots.values()) {
    runtime.bot.stop("restart");
  }

  runningBots.clear();
  const configs = await loadBots();
  for (const config of configs) {
    try {
      await startBot(config);
    } catch (error) {
      console.error(`Nao foi possivel iniciar o bot ${config.name}:`, error);
    }
  }
}

function panelHtml(bots: BotConfig[], message = "") {
  const totalPreviews = bots.reduce((sum, bot) => sum + bot.previewMediaUrls.length, 0);
  const totalDeliveries = bots.reduce((sum, bot) => sum + bot.deliveryMediaUrls.length, 0);
  const cards = bots
    .map(
      (bot) => {
        const previewItems = bot.previewMediaUrls
          .map((url) => `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(path.basename(url))}</a>`)
          .join("");
        const deliveryItems = bot.deliveryMediaUrls
          .map((url) => `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(path.basename(url))}</a>`)
          .join("");

        return `
        <article class="bot-card">
          <div class="bot-topline">
            <div>
              <p class="eyebrow">Bot Telegram</p>
              <h3>${escapeHtml(bot.name)}</h3>
            </div>
            <span class="status ${bot.active ? "status-on" : "status-off"}">${bot.active ? "Ativo" : "Pausado"}</span>
          </div>
          <div class="bot-meta">
            <span>Pix: ${escapeHtml(bot.pixKey || "-")}</span>
            <span>Delay: ${bot.messageDelayMs}ms</span>
            <span>Prévias: ${bot.previewMediaUrls.length}</span>
            <span>Entregas: ${bot.deliveryMediaUrls.length}</span>
          </div>
          <details>
            <summary>Ver prompt e mídias</summary>
            <p class="prompt-preview">${escapeHtml(bot.prompt)}</p>
            <div class="media-columns">
              <div>
                <strong>Prévias</strong>
                <div class="media-list">${previewItems || "<span>Nenhuma prévia</span>"}</div>
              </div>
              <div>
                <strong>Entregas</strong>
                <div class="media-list">${deliveryItems || "<span>Nenhuma entrega</span>"}</div>
              </div>
            </div>
          </details>
          <form class="inline-form" method="post" action="/bots/${bot.id}/delete">
            <input name="password" type="password" placeholder="Senha para remover" required />
            <button class="danger" type="submit">Remover</button>
          </form>
        </article>
      `;
      }
    )
    .join("");

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Painel Bot Telegram IA</title>
      <style>
        :root {
          color-scheme: dark;
          --bg: #050507;
          --panel: rgba(18, 18, 23, 0.82);
          --panel-strong: #14141a;
          --line: rgba(255,255,255,0.1);
          --text: #f8fafc;
          --muted: #a1a1aa;
          --green: #22c55e;
          --green-dark: #052e16;
          --red: #fb7185;
          --blue: #60a5fa;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 10%, rgba(34, 197, 94, 0.22), transparent 28rem),
            radial-gradient(circle at 90% 0%, rgba(96, 165, 250, 0.18), transparent 30rem),
            linear-gradient(135deg, #050507, #0a0a0f 55%, #111827);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        main { max-width: 1240px; margin: 0 auto; padding: 34px 20px 56px; }
        h1, h2, h3, p { margin-top: 0; }
        h1 { font-size: clamp(2rem, 5vw, 4.5rem); line-height: 0.94; letter-spacing: -0.07em; margin-bottom: 18px; }
        h2 { letter-spacing: -0.04em; }
        h3 { font-size: 1.35rem; margin-bottom: 4px; }
        .hero {
          border: 1px solid var(--line);
          border-radius: 30px;
          background: linear-gradient(135deg, rgba(20,20,26,0.9), rgba(10,10,15,0.72));
          box-shadow: 0 28px 90px rgba(0,0,0,0.4);
          display: grid;
          gap: 22px;
          margin-bottom: 20px;
          overflow: hidden;
          padding: 30px;
          position: relative;
        }
        .hero:after {
          content: "";
          position: absolute;
          inset: auto -90px -130px auto;
          width: 320px;
          height: 320px;
          background: rgba(34,197,94,0.18);
          border-radius: 999px;
          filter: blur(30px);
        }
        .hero-content { max-width: 800px; position: relative; z-index: 1; }
        .eyebrow { color: var(--green); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.16em; margin-bottom: 10px; text-transform: uppercase; }
        .muted { color: var(--muted); }
        .stats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); position: relative; z-index: 1; }
        .stat {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 16px;
        }
        .stat strong { display: block; font-size: 1.8rem; }
        .layout { display: grid; gap: 18px; grid-template-columns: minmax(340px, 0.95fr) minmax(380px, 1.35fr); align-items: start; }
        @media (max-width: 980px) { .layout { grid-template-columns: 1fr; } }
        .card, .bot-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: 0 20px 70px rgba(0,0,0,0.26);
          backdrop-filter: blur(18px);
          padding: 20px;
        }
        .form-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .form-grid .full { grid-column: 1 / -1; }
        @media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
        label { color: #d4d4d8; display: grid; font-size: 0.88rem; font-weight: 700; gap: 7px; }
        input, textarea, select {
          background: rgba(5,5,7,0.72);
          border: 1px solid var(--line);
          border-radius: 14px;
          color: var(--text);
          min-width: 0;
          outline: none;
          padding: 12px 13px;
          transition: border-color .18s, box-shadow .18s;
        }
        input:focus, textarea:focus, select:focus { border-color: rgba(34,197,94,0.72); box-shadow: 0 0 0 4px rgba(34,197,94,0.1); }
        textarea { min-height: 116px; resize: vertical; }
        input[type="file"] { background: rgba(34,197,94,0.06); border-style: dashed; }
        button {
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #22c55e, #86efac);
          color: var(--green-dark);
          cursor: pointer;
          font-weight: 900;
          padding: 12px 18px;
        }
        button.secondary { background: rgba(255,255,255,0.1); color: var(--text); border: 1px solid var(--line); }
        button.danger { background: rgba(251,113,133,0.14); border: 1px solid rgba(251,113,133,0.35); color: #fecdd3; }
        .message { border-color: rgba(34,197,94,0.55); margin-bottom: 16px; }
        .bots { display: grid; gap: 14px; }
        .bot-topline, .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .status { border-radius: 999px; font-size: 0.78rem; font-weight: 900; padding: 7px 10px; }
        .status-on { background: rgba(34,197,94,0.15); color: #86efac; }
        .status-off { background: rgba(161,161,170,0.16); color: #d4d4d8; }
        .bot-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
        .bot-meta span { background: rgba(255,255,255,0.07); border: 1px solid var(--line); border-radius: 999px; color: #e4e4e7; font-size: 0.84rem; padding: 7px 10px; }
        details { border-top: 1px solid var(--line); padding-top: 12px; }
        summary { color: #bfdbfe; cursor: pointer; font-weight: 800; }
        .prompt-preview { color: #d4d4d8; margin: 12px 0; white-space: pre-wrap; }
        .media-columns { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .media-list { display: grid; gap: 7px; margin-top: 8px; }
        .media-list a, .media-list span { background: rgba(255,255,255,0.06); border: 1px solid var(--line); border-radius: 12px; color: #dbeafe; overflow: hidden; padding: 9px; text-overflow: ellipsis; white-space: nowrap; }
        .inline-form { display: flex; gap: 8px; margin-top: 14px; }
        .inline-form input { flex: 1; }
      </style>
    </head>
    <body>
      <main>
        <section class="hero">
          <div class="hero-content">
            <p class="eyebrow">Railway MVP</p>
            <h1>Painel de Bots com IA</h1>
            <p class="muted">Configure múltiplos bots Telegram com prompt, Pix, delay, prévias por upload e entrega automática após análise do comprovante.</p>
          </div>
          <div class="stats">
            <div class="stat"><strong>${bots.length}</strong><span class="muted">bots cadastrados</span></div>
            <div class="stat"><strong>${bots.filter((bot) => bot.active).length}</strong><span class="muted">ativos agora</span></div>
            <div class="stat"><strong>${totalPreviews}</strong><span class="muted">prévias</span></div>
            <div class="stat"><strong>${totalDeliveries}</strong><span class="muted">entregas</span></div>
          </div>
        </section>
        ${message ? `<section class="card message">${message}</section>` : ""}
        <section class="layout">
          <form class="card" method="post" action="/bots" enctype="multipart/form-data">
            <div class="row">
              <div>
                <p class="eyebrow">Novo bot</p>
                <h2>Adicionar configuração</h2>
              </div>
              <button type="submit">Salvar</button>
            </div>
            <div class="form-grid">
              <label>Senha do painel <input name="password" type="password" required /></label>
              <label>Status
                <select name="active">
                  <option value="true">Ativo</option>
                  <option value="false">Pausado</option>
                </select>
              </label>
              <label>Nome do bot <input name="name" placeholder="MorenaVIP" required /></label>
              <label>Token Telegram <input name="token" placeholder="123456:ABC..." required /></label>
              <label>Chave Pix <input name="pixKey" placeholder="email, CPF, telefone..." required /></label>
              <label>Delay de mensagem em ms <input name="messageDelayMs" type="number" value="1500" /></label>
              <label class="full">Prompt/persona <textarea name="prompt" required>Voce atende leads no Telegram de forma simpatica, curta e persuasiva.</textarea></label>
              <label class="full">Upload de prévias <input name="previewFiles" type="file" accept="image/*,video/*,audio/*" multiple /></label>
              <label class="full">Upload de entregas <input name="deliveryFiles" type="file" accept="image/*,video/*,audio/*,application/pdf" multiple /></label>
              <label class="full">Links externos de prévia, um por linha <textarea name="previewMediaUrls" placeholder="https://..."></textarea></label>
              <label class="full">Links externos de entrega, um por linha <textarea name="deliveryMediaUrls" placeholder="https://..."></textarea></label>
            </div>
          </form>
          <section class="bots">
            <div class="card row">
              <div>
                <p class="eyebrow">Bots</p>
                <h2>Cadastrados</h2>
              </div>
              <form method="post" action="/restart"><button class="secondary">Reiniciar bots</button></form>
            </div>
            ${cards || "<section class='card'><p class='muted'>Nenhum bot cadastrado ainda. Crie o primeiro usando o formulário ao lado.</p></section>"}
          </section>
        </section>
      </main>
    </body>
  </html>`;
}

const app = Fastify({ logger: true });
await app.register(formbody);
await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 20
  }
});

app.get("/", async (_request, reply) => {
  const bots = await loadBots();
  return reply.type("text/html").send(panelHtml(bots));
});

app.get("/uploads/:file", async (request, reply) => {
  const params = z.object({ file: z.string().min(1) }).parse(request.params);
  const fileName = path.basename(params.file);
  const filePath = path.join(uploadsDir, fileName);

  try {
    await fs.access(filePath);
  } catch {
    return reply.code(404).send("Arquivo nao encontrado.");
  }

  return reply.type(mimeTypeFromPath(filePath)).send(fsSync.createReadStream(filePath));
});

app.post("/bots", async (request, reply) => {
  const fields: Record<string, string> = {};
  const previewUploads: string[] = [];
  const deliveryUploads: string[] = [];

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (!part.filename) {
        continue;
      }

      const url = await saveUploadedFile(part.file, part.filename);
      if (part.fieldname === "previewFiles") {
        previewUploads.push(url);
      }
      if (part.fieldname === "deliveryFiles") {
        deliveryUploads.push(url);
      }
      continue;
    }

    fields[part.fieldname] = String(part.value || "");
  }

  const body = z
    .object({
      password: z.string(),
      name: z.string().min(1),
      token: z.string().min(20),
      prompt: z.string().min(1),
      pixKey: z.string().min(1),
      messageDelayMs: z.coerce.number().default(1500),
      previewMediaUrls: z.string().default(""),
      deliveryMediaUrls: z.string().default(""),
      active: z.enum(["true", "false"]).default("true")
    })
    .parse(fields);

  if (body.password !== env.PANEL_PASSWORD) {
    return reply.code(401).type("text/html").send(panelHtml(await loadBots(), "Senha incorreta."));
  }

  const bots = await loadBots();
  bots.push({
    id: randomUUID(),
    name: body.name,
    token: body.token,
    prompt: body.prompt,
    pixKey: body.pixKey,
    messageDelayMs: body.messageDelayMs,
    previewMediaUrls: [...parseUrls(body.previewMediaUrls), ...previewUploads],
    deliveryMediaUrls: [...parseUrls(body.deliveryMediaUrls), ...deliveryUploads],
    active: body.active === "true"
  });

  await saveBots(bots);
  await restartBots();
  return reply.type("text/html").send(panelHtml(bots, "Bot salvo e processo reiniciado."));
});

app.post("/bots/:id/delete", async (request, reply) => {
  const params = z.object({ id: z.string().min(1) }).parse(request.params);
  const body = z.object({ password: z.string() }).parse(request.body);

  if (body.password !== env.PANEL_PASSWORD) {
    return reply.code(401).type("text/html").send(panelHtml(await loadBots(), "Senha incorreta."));
  }

  const bots = await loadBots();
  const nextBots = bots.filter((bot) => bot.id !== params.id);
  await saveBots(nextBots);
  await restartBots();
  return reply.type("text/html").send(panelHtml(nextBots, "Bot removido e processo reiniciado."));
});

app.post("/restart", async (_request, reply) => {
  await restartBots();
  return reply.redirect("/");
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`Painel aberto na porta ${env.PORT}`);

await ensureDataFile();
restartBots().catch((error) => {
  console.error("Erro ao iniciar bots:", error);
});

process.once("SIGINT", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGTERM");
});
