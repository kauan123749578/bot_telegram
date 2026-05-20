import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { useDatabase } from "../db/index.js";
import {
  dashboardStats,
  getLatestSale,
  listConversations,
  listLeads,
  listProducts,
  listReceipts,
  listRecentActivity,
  listSales,
  salesByDay,
  salesRankingByBot,
  saveProduct
} from "../db/events.js";
import { deleteBot, getBotById, loadBots, upsertBot, uploadsDir } from "../bots.js";
import { authenticateUser, createUser } from "../db/users.js";
import { encryptSecret } from "../lib/crypto.js";
import {
  clearSessionCookie,
  isAuthenticated,
  requireUser,
  setSessionCookie
} from "../lib/session.js";
import { getApiKeyStatus, getOpenAIModel, updateOpenAISettings } from "../lib/settings.js";
import {
  conversationsPage,
  leadsPage,
  mediaPage,
  paymentsPage,
  productsPage,
  salesChartSvgFromData
} from "./pages.js";
import {
  activityFeedHtml,
  dashboardPage,
  formatRelativeTime,
  instancesPage,
  loginPage,
  editInstancePage,
  newInstancePage,
  registerPage,
  settingsPage,
  topBotsRankingHtml
} from "./ui.js";

async function rowsForUser<T extends Record<string, unknown>>(rows: T[], userId: string) {
  const ids = new Set((await loadBots(userId)).map((b) => b.id));
  return rows.filter((r) => ids.has(String(r.bot_id ?? r.botId ?? "")));
}

async function saveUploadedFile(file: AsyncIterable<Buffer>, originalName: string) {
  await fs.mkdir(uploadsDir, { recursive: true });
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const filePath = path.join(uploadsDir, fileName);
  const chunks: Buffer[] = [];
  for await (const chunk of file) chunks.push(chunk);
  await fs.writeFile(filePath, Buffer.concat(chunks));
  return `/uploads/${fileName}`;
}

async function parseBotMultipart(request: FastifyRequest) {
  const fields: Record<string, string> = {};
  const previewUploads: string[] = [];
  const deliveryUploads: string[] = [];
  let avatarUrl = "";

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (!part.filename) continue;
      const url = await saveUploadedFile(part.file, part.filename);
      if (
        part.fieldname === "previewFiles" ||
        part.fieldname === "previewAudioFiles"
      ) {
        previewUploads.push(url);
      }
      if (
        part.fieldname === "deliveryFiles" ||
        part.fieldname === "deliveryAudioFiles"
      ) {
        deliveryUploads.push(url);
      }
      if (part.fieldname === "avatarFile") avatarUrl = url;
      continue;
    }
    fields[part.fieldname] = String(part.value || "");
  }

  return { fields, previewUploads, deliveryUploads, avatarUrl };
}

const botFormFieldsSchema = z.object({
  name: z.string().min(1),
  token: z.string().optional(),
  prompt: z.string().min(1),
  pixKey: z.string().default(""),
  pixRecipientName: z.string().optional(),
  messageDelayMinutes: z.coerce.number().min(0).max(30).default(0),
  messageDelaySeconds: z.coerce.number().min(0).max(59).default(4),
  active: z.enum(["true", "false"]).default("true"),
  paymentMethod: z.enum(["pix", "laranjinha"]).default("pix"),
  laranjinhaApiKey: z.string().optional(),
  productName: z.string().default("VIP"),
  productPrice: z.coerce.number().default(97),
  telegramGroupLink: z.string().default("")
});

function messageDelayMsFromForm(input: { messageDelayMinutes: number; messageDelaySeconds: number }) {
  const totalSeconds = input.messageDelayMinutes * 60 + input.messageDelaySeconds;
  return Math.max(1500, totalSeconds * 1000);
}

function mimeTypeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mp3") return "audio/mpeg";
  return "application/octet-stream";
}

function flashRedirect(path: string, message: string, type: "ok" | "err" = "ok") {
  return `${path}?${new URLSearchParams({ msg: message, t: type }).toString()}`;
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((i) => i.message).join(", ");
  if (error instanceof Error) return error.message;
  return "Erro desconhecido.";
}

function isPartial(request: FastifyRequest) {
  return request.headers["x-panel-partial"] === "1";
}

export async function registerPanelRoutes(
  app: FastifyInstance,
  hooks: { restartBots: () => void }
) {
  await app.register(cookie);

  app.addHook("onRequest", async (request, reply) => {
    const urlPath = request.url.split("?")[0];
    const publicPaths = ["/login", "/register", "/uploads", "/health"];
    if (publicPaths.some((p) => urlPath === p || urlPath.startsWith(`${p}/`))) return;
    if (!isAuthenticated(request)) return reply.redirect("/login");
  });

  app.get("/health", async (_request, reply) => {
    const { APP_VERSION } = await import("../version.js");
    return reply.send({ ok: true, version: APP_VERSION, database: useDatabase() });
  });

  app.get("/login", async (request, reply) => {
    if (isAuthenticated(request)) return reply.redirect("/");
    return reply.type("text/html").send(loginPage());
  });

  app.get("/register", async (request, reply) => {
    if (isAuthenticated(request)) return reply.redirect("/");
    return reply.type("text/html").send(registerPage());
  });

  app.post("/register", async (request, reply) => {
    try {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(6)
        })
        .parse(request.body);
      const user = await createUser(body);
      setSessionCookie(reply, user);
      return reply.redirect("/");
    } catch (error) {
      return reply
        .code(400)
        .type("text/html")
        .send(registerPage(errorMessage(error)));
    }
  });

  app.post("/login", async (request, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1)
      })
      .parse(request.body);
    const user = await authenticateUser(body.email, body.password);
    if (!user) {
      return reply.code(401).type("text/html").send(loginPage("E-mail ou senha incorretos."));
    }
    setSessionCookie(reply, user);
    return reply.redirect("/");
  });

  app.post("/logout", async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.redirect("/login");
  });

  app.get("/", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    const bots = await loadBots(user.id);
    const partial = isPartial(request);
    const html = dashboardPage(
      bots,
      {
        stats: await dashboardStats(user.id),
        chart: await salesByDay(7, user.id),
        activities: await listRecentActivity(8, user.id),
        topBots: await salesRankingByBot(5, user.id)
      },
      query.msg,
      query.t === "err",
      partial,
      user.name
    );
    return reply.type("text/html").send(html);
  });

  app.get("/api/panel/live", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const bots = await loadBots(user.id);
    const stats = await dashboardStats(user.id);
    const chart = await salesByDay(7, user.id);
    const activities = await listRecentActivity(8, user.id);
    const topBots = await salesRankingByBot(5, user.id);
    const latestSale = await getLatestSale(user.id);
    const recentSales = await listSales(8, user.id);

    const bellSales = recentSales.map((row) => {
      const s = row as Record<string, unknown>;
      const product = String(s.product_name ?? s.productName ?? "Produto");
      const cents = Number(s.amount_cents ?? s.amountCents ?? 0);
      const botName = String(s.bot_name ?? "Bot");
      const at = String(s.created_at ?? s.createdAt ?? new Date().toISOString());
      const reais = (cents / 100).toFixed(2).replace(".", ",");
      return {
        title: "Venda confirmada",
        subtitle: `${product} · R$ ${reais} · ${botName}`,
        time: formatRelativeTime(at)
      };
    });

    return reply.send({
      stats: {
        leads: stats.leads,
        salesTotalCents: stats.salesTotalCents,
        salesCount: stats.salesCount,
        messagesToday: stats.messagesToday,
        activeBots: bots.filter((b) => b.active).length
      },
      activityHtml: activityFeedHtml(activities),
      topBotsHtml: topBotsRankingHtml(topBots),
      chartSvg: salesChartSvgFromData(chart),
      latestSale: latestSale
        ? { id: latestSale.id, subtitle: latestSale.subtitle }
        : null,
      latestSaleAt: latestSale?.at ?? null,
      bellSales
    });
  });

  app.get("/leads", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const html = leadsPage(await rowsForUser(await listLeads(200), user.id), isPartial(request));
    return reply.type("text/html").send(html);
  });

  app.get("/conversations", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const html = conversationsPage(
      await rowsForUser(await listConversations(120), user.id),
      isPartial(request)
    );
    return reply.type("text/html").send(html);
  });

  app.get("/payments", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const html = paymentsPage(await rowsForUser(await listReceipts(80), user.id), isPartial(request));
    return reply.type("text/html").send(html);
  });

  app.get("/products", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const query = z.object({ msg: z.string().optional() }).parse(request.query);
    const bots = await loadBots(user.id);
    const html = productsPage(
      bots,
      await rowsForUser(await listProducts(), user.id),
      query.msg,
      isPartial(request)
    );
    return reply.type("text/html").send(html);
  });

  app.post("/products", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      const body = z
        .object({
          botId: z.string().min(1),
          name: z.string().min(1),
          price: z.coerce.number().min(1)
        })
        .parse(request.body);
      await saveProduct({
        botId: body.botId,
        name: body.name,
        priceCents: Math.round(body.price * 100)
      });
      return reply.redirect(flashRedirect("/products", "Produto salvo!"));
    } catch (error) {
      return reply.redirect(flashRedirect("/products", `Erro: ${errorMessage(error)}`, "err"));
    }
  });

  app.get("/media", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const html = mediaPage(await loadBots(user.id), isPartial(request));
    return reply.type("text/html").send(html);
  });

  app.get("/instances", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    return reply
      .type("text/html")
      .send(instancesPage(await loadBots(user.id), query.msg, query.t === "err", isPartial(request), user.name));
  });

  app.get("/instances/new", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    return reply
      .type("text/html")
      .send(newInstancePage(query.msg, query.t === "err", isPartial(request), user.name));
  });

  app.get("/instances/:id/edit", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const bot = await getBotById(params.id, user.id);
    if (!bot) return reply.redirect(flashRedirect("/instances", "Instância não encontrada.", "err"));
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    return reply
      .type("text/html")
      .send(editInstancePage(bot, query.msg, query.t === "err", isPartial(request), user.name));
  });

  app.post("/instances/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const editPath = `/instances/${params.id}/edit`;
    try {
      const existing = await getBotById(params.id, user.id);
      if (!existing) return reply.redirect(flashRedirect("/instances", "Instância não encontrada.", "err"));

      const { fields, previewUploads, deliveryUploads, avatarUrl } = await parseBotMultipart(request);
      const body = botFormFieldsSchema.parse(fields);
      const token = body.token?.trim();
      if (token && token.length < 20) {
        throw new Error("Token Telegram inválido.");
      }

      const laranjinhaKey = body.laranjinhaApiKey?.trim();
      await upsertBot({
        ...existing,
        name: body.name,
        token: token && token.length >= 20 ? token : existing.token,
        prompt: body.prompt,
        pixKey: body.pixKey || existing.pixKey,
        pixRecipientName: body.pixRecipientName?.trim() || body.name,
        messageDelayMs: messageDelayMsFromForm(body),
        previewMediaUrls: [...existing.previewMediaUrls, ...previewUploads],
        deliveryMediaUrls: [...existing.deliveryMediaUrls, ...deliveryUploads],
        avatarUrl: avatarUrl || existing.avatarUrl,
        active: body.active === "true",
        paymentMethod: body.paymentMethod,
        laranjinhaApiKeyEncrypted: laranjinhaKey
          ? encryptSecret(laranjinhaKey)
          : existing.laranjinhaApiKeyEncrypted,
        productName: body.productName,
        productPriceCents: Math.round(body.productPrice * 100),
        telegramGroupLink: body.telegramGroupLink.trim()
      });

      hooks.restartBots();
      return reply.redirect(flashRedirect("/instances", "Instância atualizada! Reiniciando bot..."));
    } catch (error) {
      request.log.error(error);
      return reply.redirect(flashRedirect(editPath, `Erro: ${errorMessage(error)}`, "err"));
    }
  });

  app.get("/settings", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    const status = await getApiKeyStatus(user.id);
    const model = await getOpenAIModel(user.id);
    return reply.type("text/html").send(
      settingsPage(
        {
          message: query.msg,
          messageIsError: query.t === "err",
          maskedKey: status.masked,
          configured: status.configured,
          source: status.source,
          model
        },
        isPartial(request),
        user.name
      )
    );
  });

  app.post("/settings", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      const body = z
        .object({ openaiApiKey: z.string().optional(), openaiModel: z.string().optional() })
        .parse(request.body ?? {});
      await updateOpenAISettings(user.id, { apiKey: body.openaiApiKey, model: body.openaiModel });
      return reply.redirect(flashRedirect("/settings", "Configurações salvas!"));
    } catch (error) {
      return reply.redirect(flashRedirect("/settings", `Erro: ${errorMessage(error)}`, "err"));
    }
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
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      const { fields, previewUploads, deliveryUploads, avatarUrl } = await parseBotMultipart(request);
      const body = botFormFieldsSchema
        .extend({ token: z.string().min(20) })
        .parse(fields);

      await upsertBot({
        id: randomUUID(),
        userId: user.id,
        name: body.name,
        token: body.token,
        prompt: body.prompt,
        pixKey: body.pixKey || "nao-configurado",
        pixRecipientName: body.pixRecipientName?.trim() || body.name,
        messageDelayMs: messageDelayMsFromForm(body),
        previewMediaUrls: previewUploads,
        deliveryMediaUrls: deliveryUploads,
        avatarUrl,
        active: body.active === "true",
        paymentMethod: body.paymentMethod,
        laranjinhaApiKeyEncrypted: body.laranjinhaApiKey?.trim()
          ? encryptSecret(body.laranjinhaApiKey.trim())
          : undefined,
        productName: body.productName,
        productPriceCents: Math.round(body.productPrice * 100),
        telegramGroupLink: body.telegramGroupLink.trim()
      });

      hooks.restartBots();
      return reply.redirect(flashRedirect("/instances", "Instância salva! Ativando..."));
    } catch (error) {
      request.log.error(error);
      return reply.redirect(flashRedirect("/instances/new", `Erro: ${errorMessage(error)}`, "err"));
    }
  });

  app.post("/bots/:id/toggle", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const bot = await getBotById(params.id, user.id);
      if (!bot) return reply.redirect(flashRedirect("/", "Bot nao encontrado.", "err"));
      bot.active = !bot.active;
      await upsertBot(bot);
      hooks.restartBots();
      return reply.redirect(
        flashRedirect("/", bot.active ? "Bot ativado." : "Bot pausado — nao responde no Telegram.")
      );
    } catch (error) {
      return reply.redirect(flashRedirect("/", `Erro: ${errorMessage(error)}`, "err"));
    }
  });

  app.post("/bots/:id/delete", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      await deleteBot(params.id, user.id);
      hooks.restartBots();
      return reply.redirect(flashRedirect("/", "Bot removido."));
    } catch (error) {
      return reply.redirect(flashRedirect("/", `Erro: ${errorMessage(error)}`, "err"));
    }
  });

  app.post("/restart", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    hooks.restartBots();
    return reply.redirect(flashRedirect("/", "Bots reiniciando..."));
  });
}
