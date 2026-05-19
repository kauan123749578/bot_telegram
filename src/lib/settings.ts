import fs from "node:fs/promises";
import path from "node:path";
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

async function loadSettingsFromFile(): Promise<AppSettings> {
  await fs.mkdir(env.DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(settingsFile, "utf8");
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

async function loadSettingsFromDb(): Promise<AppSettings> {
  const { rows } = await getPool().query<{
    openai_api_key_encrypted: string | null;
    openai_model: string;
  }>("SELECT openai_api_key_encrypted, openai_model FROM app_settings WHERE id = 1");

  if (!rows[0]) {
    return { ...defaultSettings };
  }

  return {
    openaiModel: rows[0].openai_model || env.OPENAI_MODEL,
    openaiApiKeyEncrypted: rows[0].openai_api_key_encrypted ?? undefined
  };
}

export async function loadSettings(): Promise<AppSettings> {
  if (useDatabase()) {
    return loadSettingsFromDb();
  }
  return loadSettingsFromFile();
}

async function saveSettingsToFile(settings: AppSettings) {
  await fs.mkdir(env.DATA_DIR, { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
}

async function saveSettingsToDb(settings: AppSettings) {
  await getPool().query(
    `INSERT INTO app_settings (id, openai_api_key_encrypted, openai_model, updated_at)
     VALUES (1, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET
       openai_api_key_encrypted = EXCLUDED.openai_api_key_encrypted,
       openai_model = EXCLUDED.openai_model,
       updated_at = NOW()`,
    [settings.openaiApiKeyEncrypted ?? null, settings.openaiModel]
  );
}

export async function saveSettings(settings: AppSettings) {
  if (useDatabase()) {
    return saveSettingsToDb(settings);
  }
  return saveSettingsToFile(settings);
}

export async function getOpenAIApiKey(): Promise<string> {
  const settings = await loadSettings();
  if (settings.openaiApiKeyEncrypted) {
    return decryptSecret(settings.openaiApiKeyEncrypted);
  }
  if (env.OPENAI_API_KEY) {
    return env.OPENAI_API_KEY;
  }
  throw new Error("Configure a OpenAI API Key no painel em Configuracoes.");
}

export async function getOpenAIModel(): Promise<string> {
  const settings = await loadSettings();
  return settings.openaiModel || env.OPENAI_MODEL;
}

export async function getApiKeyStatus() {
  const settings = await loadSettings();
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

export async function updateOpenAISettings(input: { apiKey?: string; model?: string }) {
  const current = await loadSettings();
  const next: AppSettings = {
    openaiModel: input.model?.trim() || current.openaiModel || env.OPENAI_MODEL
  };

  if (input.apiKey?.trim()) {
    next.openaiApiKeyEncrypted = encryptSecret(input.apiKey.trim());
  } else if (current.openaiApiKeyEncrypted) {
    next.openaiApiKeyEncrypted = current.openaiApiKeyEncrypted;
  }

  await saveSettings(next);
  return next;
}
