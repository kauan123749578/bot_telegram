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
import { initDatabase } from "./db/index.js";
import { getOpenAIApiKey, getOpenAIModel } from "./lib/settings.js";
import { registerPanelRoutes } from "./panel/routes.js";

const BOT_LAUNCH_TIMEOUT_MS = 20_000;

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

const runningBots = new Map<string, RuntimeBot>();

async function getOpenAI() {
  return new OpenAI({ apiKey: await getOpenAIApiKey() });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function analyzeReceiptImage(input: { imageUrl: string; pixKey: string }) {
  const openai = await getOpenAI();
  const model = await getOpenAIModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce analisa comprovantes Pix brasileiros. Responda apenas JSON valido com: paid boolean, confidence number de 0 a 1, reason string."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Verifique se esta imagem parece um comprovante Pix pago para a chave: ${input.pixKey}. Aprove somente com pagamento concluido.`
          },
          { type: "image_url", image_url: { url: input.imageUrl } }
        ]
      }
    ]
  });
  return parseReceiptAnalysis(completion.choices[0]?.message.content || "{}");
}

async function analyzeReceiptText(input: { text: string; pixKey: string }) {
  const openai = await getOpenAI();
  const model = await getOpenAIModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce analisa textos de comprovantes Pix. Responda apenas JSON: paid, confidence, reason."
      },
      {
        role: "user",
        content: `Verifique se este texto e comprovante Pix pago para ${input.pixKey}:\n\n${input.text.slice(0, 12000)}`
      }
    ]
  });
  return parseReceiptAnalysis(completion.choices[0]?.message.content || "{}");
}

async function analyzeReceiptPdf(input: { pdfUrl: string; pixKey: string }) {
  const buffer = await downloadBuffer(input.pdfUrl);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text.trim();
  if (!text) {
    return {
      paid: false,
      confidence: 0,
      reason: "Nao consegui extrair texto do PDF."
    };
  }
  return analyzeReceiptText({ text, pixKey: input.pixKey });
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
      await input.reply("Entrega liberada, mas sem midia cadastrada no painel.");
    }
    return;
  }
  await input.reply(
    `Nao consegui aprovar automaticamente.\nMotivo: ${input.result.reason}\n\nRevisao manual necessaria.`
  );
}

async function startBot(config: BotConfig) {
  if (!config.active || !config.token) return;

  const bot = new Telegraf(config.token);
  const runtime: RuntimeBot = { config, bot, historyByChat: new Map() };

  bot.start((ctx) => ctx.reply("Oi. Me manda uma mensagem que eu te atendo por aqui."));

  bot.command("pix", (ctx) =>
    ctx.reply(`Chave Pix:\n${config.pixKey}\n\nEnvie o comprovante como imagem ou PDF.`)
  );

  bot.on("photo", async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const fileUrl = await ctx.telegram.getFileLink(photos[photos.length - 1].file_id);
      await ctx.reply("Recebi seu comprovante. Vou conferir agora.");
      const result = await analyzeReceiptImage({ imageUrl: fileUrl.href, pixKey: config.pixKey });
      await handleReceiptResult({
        result,
        chatId: ctx.chat.id,
        reply: ctx.reply.bind(ctx),
        bot,
        config
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

      await ctx.reply("Recebi seu comprovante. Vou conferir agora.");
      const result = isPdfFile(fileName, mimeType)
        ? await analyzeReceiptPdf({ pdfUrl: fileUrl.href, pixKey: config.pixKey })
        : await analyzeReceiptImage({ imageUrl: fileUrl.href, pixKey: config.pixKey });

      await handleReceiptResult({
        result,
        chatId: ctx.chat.id,
        reply: ctx.reply.bind(ctx),
        bot,
        config
      });
    } catch (error) {
      console.error(error);
      await ctx.reply("Erro ao analisar comprovante. Verifique a API Key no painel.");
    }
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
      await ctx.reply(`Chave Pix:\n${config.pixKey}\n\nEnvie o comprovante como imagem ou PDF.`);
    }

    try {
      const openai = await getOpenAI();
      const model = await getOpenAIModel();
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
      await sleep(config.messageDelayMs);
      await ctx.reply(reply);
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
await registerPanelRoutes(app, {
  restartBots: () => {
    void restartBots().catch((error) => console.error("Erro ao reiniciar bots:", error));
  }
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`Painel: http://localhost:${env.PORT}`);

await ensureDataFile();
void restartBots().catch((error) => console.error("Erro ao iniciar bots:", error));

process.once("SIGINT", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  for (const runtime of runningBots.values()) runtime.bot.stop("SIGTERM");
});
