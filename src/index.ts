import path from "node:path";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { Telegraf } from "telegraf";
import {
  ensureDataFile,
  loadBots,
  uploadsDir,
  type BotConfig
} from "./bots.js";
import { env } from "./config.js";
import { initDatabase, useDatabase } from "./db/index.js";
import { logMessage, logReceipt, logSale, upsertLead } from "./db/events.js";
import { decryptSecret } from "./lib/crypto.js";
import { createLaranjinhaCharge } from "./lib/laranjinha.js";
import { humanPause } from "./lib/humanize.js";
import {
  validateReceiptFromImage,
  validateReceiptFromText,
  type ReceiptVerdict
} from "./lib/receipt-validator.js";
import { getOpenAI, getOpenAIModel } from "./lib/settings.js";
import { registerPanelRoutes } from "./panel/routes.js";

const BOT_LAUNCH_TIMEOUT_MS = 20_000;

type RuntimeBot = {
  config: BotConfig;
  bot: Telegraf;
  historyByChat: Map<number, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>;
};

const runningBots = new Map<string, RuntimeBot>();

function receiptContext(config: BotConfig) {
  return {
    pixKey: config.pixKey,
    recipientName: config.pixRecipientName || config.name,
    expectedAmountCents: config.productPriceCents,
    userId: config.userId
  };
}

async function humanReply(
  ctx: { chat: { id: number }; reply: (msg: string) => Promise<unknown>; telegram: Telegraf["telegram"] },
  config: BotConfig,
  message: string
) {
  await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
  await humanPause(config.messageDelayMs);
  return ctx.reply(message);
}

function isUploadedMedia(value: string) {
  return value.startsWith("/uploads/");
}

function uploadPathFromUrl(value: string) {
  return path.join(uploadsDir, path.basename(value));
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
    throw new Error(`Falha ao baixar arquivo: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function sendMediaList(bot: Telegraf, chatId: number, urls: string[]) {
  for (const url of urls) {
    const media = isUploadedMedia(url) ? { source: uploadPathFromUrl(url) } : url;
    if (isImageUrl(url)) await bot.telegram.sendPhoto(chatId, media);
    else if (isVideoUrl(url)) await bot.telegram.sendVideo(chatId, media);
    else if (isAudioUrl(url)) await bot.telegram.sendAudio(chatId, media);
    else await bot.telegram.sendDocument(chatId, media);
  }
}

function wantsPreview(text: string) {
  return /previa|prévia|foto|video|vídeo|audio|áudio|amostra|ver antes/i.test(text);
}

function wantsPix(text: string) {
  return /pix|pagar|pagamento|valor|preco|preço|comprar|acesso|liberar/i.test(text);
}

async function analyzeReceiptPdf(input: { pdfUrl: string; config: BotConfig }): Promise<ReceiptVerdict> {
  const buffer = await downloadBuffer(input.pdfUrl);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text.trim();
  if (!text) {
    return { paid: false, confidence: 0, reason: "Nao consegui extrair texto do PDF." };
  }
  return validateReceiptFromText({ text, ...receiptContext(input.config) });
}

async function deliverProduct(input: {
  bot: Telegraf;
  config: BotConfig;
  chatId: number;
  reply: (message: string) => Promise<unknown>;
  paymentMethod: string;
}) {
  await logSale({
    botId: input.config.id,
    chatId: input.chatId,
    productName: input.config.productName,
    amountCents: input.config.productPriceCents,
    paymentMethod: input.paymentMethod
  });

  await input.reply(`Pagamento aprovado! Liberando seu acesso...`);
  await humanPause(input.config.messageDelayMs);

  if (input.config.telegramGroupLink) {
    await input.reply(
      `Seu grupo VIP:\n${input.config.telegramGroupLink}\n\nEntre pelo link acima. Qualquer duvida, me chama aqui.`
    );
    await logMessage({
      botId: input.config.id,
      chatId: input.chatId,
      role: "system",
      content: `Entrega grupo: ${input.config.telegramGroupLink}`
    });
  }

  if (input.config.deliveryMediaUrls.length > 0) {
    await sendMediaList(input.bot, input.chatId, input.config.deliveryMediaUrls);
  } else if (!input.config.telegramGroupLink) {
    await input.reply("Produto liberado, mas configure entrega (grupo ou midia) no painel.");
  }
}

async function handleReceiptResult(input: {
  result: ReceiptVerdict;
  chatId: number;
  reply: (message: string) => Promise<unknown>;
  bot: Telegraf;
  config: BotConfig;
  fileUrl?: string;
  fileType?: string;
}) {
  await logReceipt({
    botId: input.config.id,
    chatId: input.chatId,
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    paid: input.result.paid,
    confidence: input.result.confidence,
    reason: input.result.reason
  });

  if (input.result.paid) {
    await deliverProduct({
      bot: input.bot,
      config: input.config,
      chatId: input.chatId,
      reply: input.reply,
      paymentMethod: input.config.paymentMethod
    });
    return;
  }
  await input.reply(
    `Nao consegui aprovar automaticamente.\nMotivo: ${input.result.reason}\n\nRevisao manual necessaria.`
  );
}

async function sendPaymentInstructions(
  ctx: { reply: (msg: string) => Promise<unknown>; chat: { id: number } },
  config: BotConfig
) {
  await humanPause(config.messageDelayMs);

  if (config.paymentMethod === "laranjinha" && config.laranjinhaApiKeyEncrypted) {
    try {
      const apiKey = decryptSecret(config.laranjinhaApiKeyEncrypted);
      const charge = await createLaranjinhaCharge({
        apiKey,
        amountCents: config.productPriceCents,
        description: config.productName
      });
      await ctx.reply(
        `Pagamento via Laranjinha — ${config.productName}\nValor: R$ ${(config.productPriceCents / 100).toFixed(2).replace(".", ",")}\n\nCopie o Pix:\n${charge.brCode}\n\nDepois envie o comprovante aqui.`
      );
      return;
    } catch (error) {
      console.error("Laranjinha:", error);
      await ctx.reply("Gateway indisponivel. Use a chave Pix abaixo.");
    }
  }

  await ctx.reply(
    `Chave Pix:\n${config.pixKey}\n\nProduto: ${config.productName} — R$ ${(config.productPriceCents / 100).toFixed(2).replace(".", ",")}\n\nEnvie o comprovante como imagem ou PDF.`
  );
}

async function startBot(config: BotConfig) {
  if (!config.active || !config.token) return;

  const bot = new Telegraf(config.token);
  const runtime: RuntimeBot = { config, bot, historyByChat: new Map() };

  bot.start(async (ctx) => {
    const from = ctx.from;
    await upsertLead({
      botId: config.id,
      chatId: ctx.chat.id,
      username: from?.username,
      displayName: [from?.first_name, from?.last_name].filter(Boolean).join(" ")
    });
  });

  bot.command("pix", async (ctx) => sendPaymentInstructions(ctx, config));

  bot.on("photo", async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const fileUrl = await ctx.telegram.getFileLink(photos[photos.length - 1].file_id);
      await humanReply(ctx, config, "Recebi seu comprovante. Vou conferir agora.");
      const result = await validateReceiptFromImage({ imageUrl: fileUrl.href, ...receiptContext(config) });
      await handleReceiptResult({
        result,
        chatId: ctx.chat.id,
        reply: ctx.reply.bind(ctx),
        bot,
        config,
        fileUrl: fileUrl.href,
        fileType: "image"
      });
    } catch (error) {
      console.error(error);
      await ctx.reply("Erro ao analisar comprovante. Verifique a API Key no painel.");
    }
  });

  bot.on("document", async (ctx) => {
    try {
      const document = ctx.message.document;
      const fileName = document.file_name || "";
      const mimeType = document.mime_type || "";
      const fileUrl = await ctx.telegram.getFileLink(document.file_id);

      if (!isPdfFile(fileName, mimeType) && !isImageFile(fileName, mimeType)) {
        await ctx.reply("Para comprovante, envie imagem ou PDF.");
        return;
      }

      await humanReply(ctx, config, "Recebi seu comprovante. Vou conferir agora.");
      const result = isPdfFile(fileName, mimeType)
        ? await analyzeReceiptPdf({ pdfUrl: fileUrl.href, config })
        : await validateReceiptFromImage({ imageUrl: fileUrl.href, ...receiptContext(config) });

      await handleReceiptResult({
        result,
        chatId: ctx.chat.id,
        reply: ctx.reply.bind(ctx),
        bot,
        config,
        fileUrl: fileUrl.href,
        fileType: isPdfFile(fileName, mimeType) ? "pdf" : "image"
      });
    } catch (error) {
      console.error(error);
      await ctx.reply("Erro ao analisar comprovante. Verifique a API Key no painel.");
    }
  });

  bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const from = ctx.from;
    await upsertLead({
      botId: config.id,
      chatId,
      username: from?.username,
      displayName: [from?.first_name, from?.last_name].filter(Boolean).join(" ")
    });
    await logMessage({ botId: config.id, chatId, role: "user", content: text });

    const history = runtime.historyByChat.get(chatId) || [];
    runtime.historyByChat.set(chatId, history);

    if (wantsPreview(text) && config.previewMediaUrls.length > 0) {
      await humanReply(ctx, config, "Vou te mandar uma previa.");
      await sendMediaList(bot, chatId, config.previewMediaUrls);
      return;
    }

    if (wantsPix(text)) {
      await sendPaymentInstructions(ctx, config);
    }

    try {
      const openai = await getOpenAI(config.userId);
      const model = await getOpenAIModel(config.userId);
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `${config.prompt}\n\nPix: ${config.pixKey}. Responda curto e natural.`
          },
          ...history.slice(-10),
          { role: "user", content: text }
        ]
      });
      const reply = completion.choices[0]?.message.content?.trim() || "Me chama de novo.";
      history.push({ role: "user", content: text }, { role: "assistant", content: reply });
      await logMessage({ botId: config.id, chatId, role: "assistant", content: reply });
      await humanReply(ctx, config, reply);
    } catch (error) {
      console.error(error);
      await ctx.reply("IA indisponivel. Configure a OpenAI API Key em Configuracoes no painel.");
    }
  });

  bot.catch((error) => console.error(`Erro no bot ${config.name}:`, error));

  await Promise.race([
    bot.launch(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao conectar no Telegram")), BOT_LAUNCH_TIMEOUT_MS)
    )
  ]);
  runningBots.set(config.id, runtime);
  console.log(`Bot ativo: ${config.name}`);
}

let restartInProgress = false;

export async function restartBots() {
  if (restartInProgress) {
    console.log("[bots] Reinicio ja em andamento, ignorando...");
    return;
  }
  restartInProgress = true;
  try {
    await Promise.all(
      [...runningBots.values()].map(async (runtime) => {
        try {
          runtime.bot.stop("restart");
        } catch {
          // ignore
        }
      })
    );
    runningBots.clear();

    for (const config of await loadBots()) {
      if (!config.active) continue;
      try {
        await startBot(config);
      } catch (error) {
        console.error(`Nao foi possivel iniciar ${config.name}:`, error);
      }
    }
  } finally {
    restartInProgress = false;
  }
}

const app = Fastify({ logger: true });
await app.register(formbody);
await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024, files: 20 }
});

await initDatabase();
if (!useDatabase()) {
  const { initUsersSchema } = await import("./db/users.js");
  await initUsersSchema();
}
await registerPanelRoutes(app, {
  restartBots: () => {
    void restartBots().catch((error) => console.error("Erro ao reiniciar bots:", error));
  }
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });

await ensureDataFile();
const botsOnStart = await loadBots();
console.log("[startup] Servidor online na porta", env.PORT);
console.log("[startup] Banco:", useDatabase() ? "PostgreSQL OK" : "arquivos locais (sem DATABASE_URL)");
console.log("[startup] Bots cadastrados:", botsOnStart.length);
console.log("[startup] Painel publico: https://telegramia-production.up.railway.app");

void restartBots().catch((error) => console.error("Erro ao iniciar bots:", error));

process.once("SIGINT", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGTERM");
});
