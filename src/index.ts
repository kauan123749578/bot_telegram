import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { Telegraf } from "telegraf";
import {
  ensureDataFile,
  loadBots,
  type BotConfig
} from "./bots.js";
import { env } from "./config.js";
import { initDatabase, useDatabase } from "./db/index.js";
import { logMessage, logReceipt, logSale, upsertLead } from "./db/events.js";
import { decryptSecret } from "./lib/crypto.js";
import { createLaranjinhaCharge } from "./lib/laranjinha.js";
import { findNamedAudio } from "./lib/named-audio.js";
import { randomPreviewIntro } from "./lib/humanize.js";
import { formatReceiptOutcome, randomReceiptAck } from "./lib/receipt-messages.js";
import {
  validateReceiptFromImage,
  validateReceiptFromText,
  type ReceiptVerdict
} from "./lib/receipt-validator.js";
import { getOpenAI, getOpenAIModel } from "./lib/settings.js";
import {
  humanReadingPause,
  humanSendMediaList,
  humanSendNamedAudio,
  humanSendText,
  humanSendTexts
} from "./lib/telegram-send.js";
import { registerPanelRoutes } from "./panel/routes.js";

const BOT_LAUNCH_TIMEOUT_MS = 20_000;
const PREVIEW_COOLDOWN_MS = 90_000;

type RuntimeBot = {
  config: BotConfig;
  bot: Telegraf;
  historyByChat: Map<number, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>;
  previewSentAt: Map<number, number>;
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

function wantsPreview(text: string) {
  return /previa|prévia|foto|video|vídeo|audio|áudio|amostra|ver antes|manda foto|mandar foto/i.test(
    text
  );
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
    return { paid: false, confidence: 0, reason: "Nao foi possivel extrair texto do PDF." };
  }
  return validateReceiptFromText({ text, ...receiptContext(input.config) });
}

async function deliverProduct(input: {
  bot: Telegraf;
  config: BotConfig;
  chatId: number;
}) {
  const { bot, config, chatId } = input;
  const telegram = bot.telegram;

  await logSale({
    botId: config.id,
    chatId,
    productName: config.productName,
    amountCents: config.productPriceCents,
    paymentMethod: config.paymentMethod
  });

  if (config.telegramGroupLink) {
    await humanSendText(
      telegram,
      chatId,
      config,
      `Seu grupo VIP:\n${config.telegramGroupLink}\n\nEntre pelo link acima. Qualquer duvida, me chama aqui.`
    );
    await logMessage({
      botId: config.id,
      chatId,
      role: "system",
      content: `Entrega grupo: ${config.telegramGroupLink}`
    });
  }

  if (config.deliveryMediaUrls.length > 0) {
    await humanSendMediaList(telegram, chatId, config, config.deliveryMediaUrls);
  } else if (!config.telegramGroupLink) {
    await humanSendText(
      telegram,
      chatId,
      config,
      "Produto liberado, mas configure entrega (grupo ou midia) no painel."
    );
  }
}

async function handleReceiptResult(input: {
  result: ReceiptVerdict;
  chatId: number;
  bot: Telegraf;
  config: BotConfig;
  fileUrl?: string;
  fileType?: string;
}) {
  const telegram = input.bot.telegram;

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
    await humanSendText(
      telegram,
      input.chatId,
      input.config,
      formatReceiptOutcome(input.result, input.result.userMessage)
    );
    await deliverProduct({
      bot: input.bot,
      config: input.config,
      chatId: input.chatId
    });
    return;
  }

  await humanSendText(
    telegram,
    input.chatId,
    input.config,
    formatReceiptOutcome(input.result, input.result.userMessage)
  );
}

async function sendPaymentInstructions(bot: Telegraf, chatId: number, config: BotConfig) {
  const telegram = bot.telegram;
  const price = (config.productPriceCents / 100).toFixed(2).replace(".", ",");

  if (config.paymentMethod === "laranjinha" && config.laranjinhaApiKeyEncrypted) {
    try {
      const apiKey = decryptSecret(config.laranjinhaApiKeyEncrypted);
      const charge = await createLaranjinhaCharge({
        apiKey,
        amountCents: config.productPriceCents,
        description: config.productName
      });
      await humanSendTexts(telegram, chatId, config, [
        `Ótima escolha! ${config.productName} — R$ ${price}`,
        `Copia o Pix aqui:\n${charge.brCode}`,
        "Depois me manda o comprovante por aqui mesmo, tá?"
      ]);
      return;
    } catch (error) {
      console.error("Laranjinha:", error);
      await humanSendText(telegram, chatId, config, "Gateway indisponivel no momento. Segue a chave Pix:");
    }
  }

  await humanSendTexts(telegram, chatId, config, [
    `Chave Pix: ${config.pixKey}`,
    `Produto: ${config.productName} — R$ ${price}`,
    "Quando pagar, manda o comprovante em imagem ou PDF."
  ]);
}

async function sendPreview(runtime: RuntimeBot, chatId: number, opts?: { skipIntro?: boolean }) {
  const { bot, config, previewSentAt } = runtime;
  const now = Date.now();
  const last = previewSentAt.get(chatId) ?? 0;

  if (now - last < PREVIEW_COOLDOWN_MS) {
    return false;
  }

  previewSentAt.set(chatId, now);
  if (!opts?.skipIntro) {
    await humanSendText(bot.telegram, chatId, config, randomPreviewIntro());
  }
  await humanSendMediaList(bot.telegram, chatId, config, config.previewMediaUrls);
  return true;
}

async function processReceiptFile(input: {
  ctx: { chat: { id: number }; telegram: Telegraf["telegram"] };
  bot: Telegraf;
  config: BotConfig;
  fileUrl: string;
  fileType: string;
  validate: () => Promise<ReceiptVerdict>;
}) {
  const chatId = input.ctx.chat.id;
  const telegram = input.ctx.telegram;

  await humanSendText(telegram, chatId, input.config, randomReceiptAck());
  await humanReadingPause(input.config);

  const result = await input.validate();
  await handleReceiptResult({
    result,
    chatId,
    bot: input.bot,
    config: input.config,
    fileUrl: input.fileUrl,
    fileType: input.fileType
  });
}

async function startBot(config: BotConfig) {
  if (!config.active || !config.token) return;

  const bot = new Telegraf(config.token);
  const runtime: RuntimeBot = {
    config,
    bot,
    historyByChat: new Map(),
    previewSentAt: new Map()
  };

  bot.start(async (ctx) => {
    const from = ctx.from;
    await upsertLead({
      botId: config.id,
      chatId: ctx.chat.id,
      username: from?.username,
      displayName: [from?.first_name, from?.last_name].filter(Boolean).join(" ")
    });
  });

  bot.command("pix", async (ctx) => sendPaymentInstructions(bot, ctx.chat.id, config));

  bot.on("photo", async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const fileUrl = await ctx.telegram.getFileLink(photos[photos.length - 1].file_id);
      await processReceiptFile({
        ctx,
        bot,
        config,
        fileUrl: fileUrl.href,
        fileType: "image",
        validate: () =>
          validateReceiptFromImage({ imageUrl: fileUrl.href, ...receiptContext(config) })
      });
    } catch (error) {
      console.error(error);
      await humanSendText(
        ctx.telegram,
        ctx.chat.id,
        config,
        "Deu um probleminha ao conferir. Tenta mandar de novo ou fala comigo."
      );
    }
  });

  bot.on("document", async (ctx) => {
    try {
      const document = ctx.message.document;
      const fileName = document.file_name || "";
      const mimeType = document.mime_type || "";
      const fileUrl = await ctx.telegram.getFileLink(document.file_id);

      if (!isPdfFile(fileName, mimeType) && !isImageFile(fileName, mimeType)) {
        await humanSendText(
          ctx.telegram,
          ctx.chat.id,
          config,
          "Para comprovante, manda imagem ou PDF, tá?"
        );
        return;
      }

      await processReceiptFile({
        ctx,
        bot,
        config,
        fileUrl: fileUrl.href,
        fileType: isPdfFile(fileName, mimeType) ? "pdf" : "image",
        validate: () =>
          isPdfFile(fileName, mimeType)
            ? analyzeReceiptPdf({ pdfUrl: fileUrl.href, config })
            : validateReceiptFromImage({ imageUrl: fileUrl.href, ...receiptContext(config) })
      });
    } catch (error) {
      console.error(error);
      await humanSendText(
        ctx.telegram,
        ctx.chat.id,
        config,
        "Deu um probleminha ao conferir. Tenta mandar de novo ou fala comigo."
      );
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

    const library = config.audioLibrary ?? [];
    const userAudio = findNamedAudio(text, library);
    if (userAudio) {
      await humanSendNamedAudio(ctx.telegram, chatId, config, userAudio.url);
      return;
    }

    if (wantsPreview(text) && config.previewMediaUrls.length > 0) {
      await sendPreview(runtime, chatId);
      return;
    }

    if (wantsPix(text)) {
      await sendPaymentInstructions(bot, chatId, config);
      return;
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
            content: `${config.prompt}

Pix: ${config.pixKey}. Produto: ${config.productName}.
Audios nomeados (quando fizer sentido, cite exatamente o nome para o sistema enviar o arquivo): ${
              library.map((a) => `"${a.label}"`).join(", ") || "nenhum"
            }.
Regras: respostas curtas e naturais; uma ideia por vez; nao repita frases; se pedirem previa/foto, diga que vai mandar sem enviar links; nao invente que ja enviou midia.`
          },
          ...history.slice(-10),
          { role: "user", content: text }
        ]
      });
      const reply = completion.choices[0]?.message.content?.trim() || "Me chama de novo.";
      history.push({ role: "user", content: text }, { role: "assistant", content: reply });
      await logMessage({ botId: config.id, chatId, role: "assistant", content: reply });

      const lower = reply.toLowerCase();
      const aiOffersPreview =
        /previa|prévia|vou te mandar|segue a foto|mando agora|olha s[oó]/i.test(lower) &&
        config.previewMediaUrls.length > 0;

      const replyAudio = findNamedAudio(reply, library);
      if (replyAudio) {
        await humanSendNamedAudio(ctx.telegram, chatId, config, replyAudio.url);
      } else {
        await humanSendText(ctx.telegram, chatId, config, reply);
      }

      if (aiOffersPreview) {
        await sendPreview(runtime, chatId, { skipIntro: true });
      }
    } catch (error) {
      console.error(error);
      await humanSendText(
        ctx.telegram,
        chatId,
        config,
        "IA indisponivel. Configure a OpenAI API Key em Configuracoes no painel."
      );
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
