import { Telegraf } from "telegraf";
import type { BotConfig } from "../bots.js";
import { listLeadsByBot } from "../db/events.js";
import { humanSendText } from "./telegram-send.js";

export async function sendRemarketing(input: {
  config: BotConfig;
  message: string;
}) {
  const leads = await listLeadsByBot(input.config.id);
  if (leads.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const bot = new Telegraf(input.config.token);
  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      await humanSendText(bot.telegram, lead.chatId, input.config, input.message);
      sent++;
    } catch (error) {
      console.error(`Remarketing falhou chat ${lead.chatId}:`, error);
      failed++;
    }
  }

  return { sent, failed, total: leads.length };
}
