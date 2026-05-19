import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { useDatabase } from "../db/index.js";
import {
  loadBots,
  parseUrls,
  saveBots,
  uploadsDir,
} from "../bots.js";
import {
  clearSessionCookie,
  isAuthenticated,
  requireAuth,
  setSessionCookie
} from "../lib/session.js";
import {
  getApiKeyStatus,
  getOpenAIModel,
  updateOpenAISettings
} from "../lib/settings.js";
import { dashboardPage, loginPage, settingsPage } from "./ui.js";

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
  const params = new URLSearchParams({ msg: message, t: type });
  return `${path}?${params.toString()}`;
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((i) => i.message).join(", ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro desconhecido.";
}

export async function registerPanelRoutes(
  app: FastifyInstance,
  hooks: { restartBots: () => void }
) {
  await app.register(cookie);

  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0];
    const publicPaths = ["/login", "/uploads", "/health"];
    if (publicPaths.some((p) => path === p || path.startsWith(`${p}/`))) {
      return;
    }
    if (!isAuthenticated(request)) {
      return reply.redirect("/login");
    }
  });

  app.get("/health", async (_request, reply) => {
    return reply.send({ ok: true, database: useDatabase() });
  });

  app.get("/login", async (request, reply) => {
    if (isAuthenticated(request)) {
      return reply.redirect("/");
    }
    return reply.type("text/html").send(loginPage());
  });

  app.post("/login", async (request, reply) => {
    const body = z.object({ password: z.string() }).parse(request.body);
    if (body.password !== env.PANEL_PASSWORD) {
      return reply.code(401).type("text/html").send(loginPage("Senha incorreta."));
    }
    setSessionCookie(reply);
    return reply.redirect("/");
  });

  app.post("/logout", async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.redirect("/login");
  });

  app.get("/", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    const bots = await loadBots();
    const isError = query.t === "err";
    return reply.type("text/html").send(dashboardPage(bots, query.msg, isError));
  });

  app.get("/settings", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = z.object({ msg: z.string().optional(), t: z.string().optional() }).parse(request.query);
    const status = await getApiKeyStatus();
    const model = await getOpenAIModel();
    const isError = query.t === "err";
    return reply.type("text/html").send(
      settingsPage({
        message: query.msg,
        messageIsError: isError,
        maskedKey: status.masked,
        configured: status.configured,
        source: status.source,
        model
      })
    );
  });

  app.post("/settings", async (request, reply) => {
    if (!requireAuth(request, reply)) return;

    try {
      const body = z
        .object({
          openaiApiKey: z.string().optional(),
          openaiModel: z.string().optional()
        })
        .parse(request.body ?? {});

      await updateOpenAISettings({
        apiKey: body.openaiApiKey,
        model: body.openaiModel
      });

      return reply.redirect(flashRedirect("/settings", "Configurações salvas com sucesso!"));
    } catch (error) {
      request.log.error(error);
      return reply.redirect(
        flashRedirect("/settings", `Erro ao salvar: ${errorMessage(error)}`, "err")
      );
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
    if (!requireAuth(request, reply)) return;

    try {
      const fields: Record<string, string> = {};
      const previewUploads: string[] = [];
      const deliveryUploads: string[] = [];

      for await (const part of request.parts()) {
        if (part.type === "file") {
          if (!part.filename) continue;
          const url = await saveUploadedFile(part.file, part.filename);
          if (part.fieldname === "previewFiles") previewUploads.push(url);
          if (part.fieldname === "deliveryFiles") deliveryUploads.push(url);
          continue;
        }
        fields[part.fieldname] = String(part.value || "");
      }

      const body = z
        .object({
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
      hooks.restartBots();

      return reply.redirect(
        flashRedirect("/", "Bot salvo! Ativando em segundo plano (pode levar alguns segundos).")
      );
    } catch (error) {
      request.log.error(error);
      return reply.redirect(flashRedirect("/", `Erro ao salvar bot: ${errorMessage(error)}`, "err"));
    }
  });

  app.post("/bots/:id/delete", async (request, reply) => {
    if (!requireAuth(request, reply)) return;

    try {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const bots = await loadBots();
      const nextBots = bots.filter((bot) => bot.id !== params.id);
      await saveBots(nextBots);
      hooks.restartBots();
      return reply.redirect(flashRedirect("/", "Bot removido."));
    } catch (error) {
      request.log.error(error);
      return reply.redirect(flashRedirect("/", `Erro ao remover: ${errorMessage(error)}`, "err"));
    }
  });

  app.post("/restart", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    hooks.restartBots();
    return reply.redirect(flashRedirect("/", "Bots reiniciando em segundo plano..."));
  });
}
