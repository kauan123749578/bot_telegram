import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "./config.js";
import { getPool, useDatabase } from "./db/index.js";

const dataDir = env.DATA_DIR;
const uploadsDir = path.join(dataDir, "uploads");
export const botsFile = path.join(dataDir, "bots.json");

export type BotConfig = {
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

export function parseUrls(value: string) {
  return value
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export async function ensureDataFile() {
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

function rowToBot(row: {
  id: string;
  name: string;
  token: string;
  prompt: string;
  pix_key: string;
  message_delay_ms: number;
  preview_media_urls: string[] | string;
  delivery_media_urls: string[] | string;
  active: boolean;
}): BotConfig {
  return {
    id: row.id,
    name: row.name,
    token: row.token,
    prompt: row.prompt,
    pixKey: row.pix_key,
    messageDelayMs: row.message_delay_ms,
    previewMediaUrls:
      typeof row.preview_media_urls === "string"
        ? JSON.parse(row.preview_media_urls)
        : row.preview_media_urls,
    deliveryMediaUrls:
      typeof row.delivery_media_urls === "string"
        ? JSON.parse(row.delivery_media_urls)
        : row.delivery_media_urls,
    active: row.active
  };
}

export async function loadBots() {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `SELECT id, name, token, prompt, pix_key, message_delay_ms, preview_media_urls, delivery_media_urls, active
       FROM bots ORDER BY created_at ASC`
    );
    return rows.map(rowToBot);
  }

  await ensureDataFile();
  const raw = await fs.readFile(botsFile, "utf8");
  return JSON.parse(raw) as BotConfig[];
}

export async function saveBots(bots: BotConfig[]) {
  if (useDatabase()) {
    const db = getPool();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM bots");
      for (const bot of bots) {
        await client.query(
          `INSERT INTO bots (id, name, token, prompt, pix_key, message_delay_ms, preview_media_urls, delivery_media_urls, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)`,
          [
            bot.id,
            bot.name,
            bot.token,
            bot.prompt,
            bot.pixKey,
            bot.messageDelayMs,
            JSON.stringify(bot.previewMediaUrls),
            JSON.stringify(bot.deliveryMediaUrls),
            bot.active
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(botsFile, JSON.stringify(bots, null, 2));
}

export { uploadsDir, dataDir };
