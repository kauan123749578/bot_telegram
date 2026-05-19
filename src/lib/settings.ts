import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { env } from "../config.js";
import { getPool, useDatabase } from "../db/index.js";
import { decryptSecret, encryptSecret, maskApiKey } from "./crypto.js";

const settingsFile = path.join(env.DATA_DIR, "settings.json");

export type AppSettings = {
  openaiApiKeyEncrypted?: string;
  openaiModel: string;
};

const defaultSettings: AppSettings = {
  openaiModel: env.OPENAI_MODEL
};

async function loadSettingsFromFile(userId: string): Promise<AppSettings> {
  const userFile = path.join(env.DATA_DIR, `settings-${userId}.json`);
  try {
    const raw = await fs.readFile(userFile, "utf8");
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    try {
      const raw = await fs.readFile(settingsFile, "utf8");
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultSettings };
    }
  }
}

async function loadSettingsFromDb(userId: string): Promise<AppSettings> {
  const { rows } = await getPool().query<{
    openai_api_key_encrypted: string | null;
    openai_model: string;
  }>(
    `SELECT openai_api_key_encrypted, openai_model FROM user_settings WHERE user_id = $1`,
    [userId]
  );

  if (!rows[0]) {
    const legacy = await getPool().query<{
      openai_api_key_encrypted: string | null;
      openai_model: string;
    }>("SELECT openai_api_key_encrypted, openai_model FROM app_settings WHERE id = 1");
    if (legacy.rows[0]) {
      return {
        openaiModel: legacy.rows[0].openai_model || env.OPENAI_MODEL,
        openaiApiKeyEncrypted: legacy.rows[0].openai_api_key_encrypted ?? undefined
      };
    }
    return { ...defaultSettings };
  }

  return {
    openaiModel: rows[0].openai_model || env.OPENAI_MODEL,
    openaiApiKeyEncrypted: rows[0].openai_api_key_encrypted ?? undefined
  };
}

export async function loadSettings(userId: string): Promise<AppSettings> {
  if (useDatabase()) {
    return loadSettingsFromDb(userId);
  }
  return loadSettingsFromFile(userId);
}

async function saveSettingsToFile(userId: string, settings: AppSettings) {
  await fs.mkdir(env.DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(env.DATA_DIR, `settings-${userId}.json`), JSON.stringify(settings, null, 2));
}

async function saveSettingsToDb(userId: string, settings: AppSettings) {
  await getPool().query(
    `INSERT INTO user_settings (user_id, openai_api_key_encrypted, openai_model, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       openai_api_key_encrypted = EXCLUDED.openai_api_key_encrypted,
       openai_model = EXCLUDED.openai_model,
       updated_at = NOW()`,
    [userId, settings.openaiApiKeyEncrypted ?? null, settings.openaiModel]
  );
}

export async function saveSettings(userId: string, settings: AppSettings) {
  if (useDatabase()) {
    return saveSettingsToDb(userId, settings);
  }
  return saveSettingsToFile(userId, settings);
}

export async function getOpenAIApiKey(userId: string): Promise<string> {
  const settings = await loadSettings(userId);
  if (settings.openaiApiKeyEncrypted) {
    return decryptSecret(settings.openaiApiKeyEncrypted);
  }
  if (env.OPENAI_API_KEY) {
    return env.OPENAI_API_KEY;
  }
  throw new Error("Configure a OpenAI API Key no painel em Configuracoes.");
}

export async function getOpenAIModel(userId: string): Promise<string> {
  const settings = await loadSettings(userId);
  return settings.openaiModel || env.OPENAI_MODEL;
}

export async function getOpenAI(userId: string) {
  const apiKey = await getOpenAIApiKey(userId);
  return new OpenAI({ apiKey });
}

export async function getApiKeyStatus(userId: string) {
  const settings = await loadSettings(userId);
  if (settings.openaiApiKeyEncrypted) {
    try {
      const key = decryptSecret(settings.openaiApiKeyEncrypted);
      return { configured: true, masked: maskApiKey(key), source: "painel" as const };
    } catch {
      return { configured: false, masked: "", source: "painel" as const };
    }
  }
  if (env.OPENAI_API_KEY) {
    return { configured: true, masked: maskApiKey(env.OPENAI_API_KEY), source: "env" as const };
  }
  return { configured: false, masked: "", source: "none" as const };
}

export async function updateOpenAISettings(
  userId: string,
  input: { apiKey?: string; model?: string }
) {
  const current = await loadSettings(userId);
  const next: AppSettings = {
    openaiModel: input.model?.trim() || current.openaiModel || env.OPENAI_MODEL
  };

  if (input.apiKey?.trim()) {
    next.openaiApiKeyEncrypted = encryptSecret(input.apiKey.trim());
  } else if (current.openaiApiKeyEncrypted) {
    next.openaiApiKeyEncrypted = current.openaiApiKeyEncrypted;
  }

  await saveSettings(userId, next);
  return next;
}
