import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const envSchema = z.object({
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  PANEL_PASSWORD: z.string().min(6).default("troque-essa-senha"),
  SESSION_SECRET: z.string().min(16).optional(),
  PORT: z.coerce.number().default(3000),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  BOT_NAME: z.string().default("Bot Principal"),
  BOT_PROMPT: z.string().default("Voce atende leads no Telegram de forma simpatica e objetiva."),
  PIX_KEY: z.string().default(""),
  MESSAGE_DELAY_MS: z.coerce.number().default(1500),
  PREVIEW_MEDIA_URLS: z.string().default(""),
  DELIVERY_MEDIA_URLS: z.string().default(""),
  DATABASE_URL: z.string().default(""),
  DATA_DIR: z.string().default("")
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    const data = parsed.data;
    return {
      ...data,
      SESSION_SECRET: data.SESSION_SECRET || `${data.PANEL_PASSWORD}-session-secret-v1`,
      DATA_DIR: data.DATA_DIR || path.join(rootDir, "data")
    };
  }

  console.error("\n[ERRO] Variaveis de ambiente invalidas.\n");
  console.error("No Railway > Variables, configure pelo menos:");
  console.error("  PANEL_PASSWORD = senha do painel");
  console.error("  OPENAI_API_KEY = opcional se configurar depois no painel\n");
  process.exit(1);
}

export const env = loadEnv();
