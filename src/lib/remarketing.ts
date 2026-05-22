import { Telegraf } from "telegraf";
import type { BotConfig } from "../bots.js";
import { listLeadsByBot } from "../db/events.js";
import { humanSendText } from "./telegram-send.js";

export async function sendRemarketing(input: {
  config: BotConfig;
  messages: { chatId: number; message: string }[];
}) {
  const leads = await listLeadsByBot(input.config.id);
  if (leads.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, total: 0 };
  }

  const byChat = new Map(input.messages.map((m) => [m.chatId, m.message.trim()]));
  const bot = new Telegraf(input.config.token);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of leads) {
    const message = byChat.get(lead.chatId);
    if (!message) {
      skipped++;
      continue;
    }
    try {
      await humanSendText(bot.telegram, lead.chatId, input.config, message);
      sent++;
    } catch (error) {
      console.error(`Remarketing falhou chat ${lead.chatId}:`, error);
      failed++;
    }
  }

  return { sent, failed, skipped, total: leads.length };
}
