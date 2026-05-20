import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config.js";
import { getPool, useDatabase } from "./index.js";

const eventsFile = path.join(env.DATA_DIR, "events.json");

type Store = {
  leads: Lead[];
  messages: ConversationMessage[];
  receipts: Receipt[];
  sales: Sale[];
  products: Product[];
};

export type Lead = {
  id: string;
  botId: string;
  chatId: number;
  username?: string;
  displayName?: string;
  createdAt: string;
  lastMessageAt: string;
};

export type ConversationMessage = {
  id: string;
  botId: string;
  chatId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type Receipt = {
  id: string;
  botId: string;
  chatId: number;
  fileUrl?: string;
  fileType?: string;
  paid: boolean;
  confidence: number;
  reason: string;
  createdAt: string;
};

export type Sale = {
  id: string;
  botId: string;
  chatId: number;
  productName: string;
  amountCents: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export type Product = {
  id: string;
  botId: string;
  name: string;
  priceCents: number;
  active: boolean;
  createdAt: string;
};

const emptyStore = (): Store => ({
  leads: [],
  messages: [],
  receipts: [],
  sales: [],
  products: []
});

async function loadFileStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(eventsFile, "utf8");
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

async function saveFileStore(store: Store) {
  await fs.mkdir(env.DATA_DIR, { recursive: true });
  await fs.writeFile(eventsFile, JSON.stringify(store, null, 2));
}

export async function initEventsSchema() {
  if (!useDatabase()) return;

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL,
      chat_id BIGINT NOT NULL,
      username TEXT,
      display_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(bot_id, chat_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL,
      chat_id BIGINT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL,
      chat_id BIGINT NOT NULL,
      file_url TEXT,
      file_type TEXT,
      paid BOOLEAN NOT NULL DEFAULT false,
      confidence NUMERIC NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL,
      chat_id BIGINT NOT NULL,
      product_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'pix',
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bot_id UUID NOT NULL,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE bots ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'pix';
    ALTER TABLE bots ADD COLUMN IF NOT EXISTS laranjinha_api_key_encrypted TEXT;
    ALTER TABLE bots ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT 'VIP';
    ALTER TABLE bots ADD COLUMN IF NOT EXISTS product_price_cents INTEGER NOT NULL DEFAULT 4990;
    ALTER TABLE bots ADD COLUMN IF NOT EXISTS telegram_group_link TEXT NOT NULL DEFAULT '';
  `);
}

export async function upsertLead(input: {
  botId: string;
  chatId: number;
  username?: string;
  displayName?: string;
}) {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO leads (bot_id, chat_id, username, display_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (bot_id, chat_id) DO UPDATE SET
         username = COALESCE(EXCLUDED.username, leads.username),
         display_name = COALESCE(EXCLUDED.display_name, leads.display_name),
         last_message_at = NOW()`,
      [input.botId, input.chatId, input.username ?? null, input.displayName ?? null]
    );
    return;
  }

  const store = await loadFileStore();
  const existing = store.leads.find((l) => l.botId === input.botId && l.chatId === input.chatId);
  const now = new Date().toISOString();
  if (existing) {
    existing.lastMessageAt = now;
    if (input.username) existing.username = input.username;
    if (input.displayName) existing.displayName = input.displayName;
  } else {
    store.leads.push({
      id: randomUUID(),
      botId: input.botId,
      chatId: input.chatId,
      username: input.username,
      displayName: input.displayName,
      createdAt: now,
      lastMessageAt: now
    });
  }
  await saveFileStore(store);
}

export async function logMessage(input: {
  botId: string;
  chatId: number;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO conversation_messages (bot_id, chat_id, role, content) VALUES ($1,$2,$3,$4)`,
      [input.botId, input.chatId, input.role, input.content.slice(0, 8000)]
    );
    return;
  }

  const store = await loadFileStore();
  store.messages.push({
    id: randomUUID(),
    botId: input.botId,
    chatId: input.chatId,
    role: input.role,
    content: input.content.slice(0, 8000),
    createdAt: new Date().toISOString()
  });
  if (store.messages.length > 5000) store.messages = store.messages.slice(-5000);
  await saveFileStore(store);
}

export async function logReceipt(input: {
  botId: string;
  chatId: number;
  fileUrl?: string;
  fileType?: string;
  paid: boolean;
  confidence: number;
  reason: string;
}) {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO receipts (bot_id, chat_id, file_url, file_type, paid, confidence, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.botId,
        input.chatId,
        input.fileUrl ?? null,
        input.fileType ?? null,
        input.paid,
        input.confidence,
        input.reason
      ]
    );
    return;
  }

  const store = await loadFileStore();
  store.receipts.unshift({
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString()
  });
  await saveFileStore(store);
}

export async function logSale(input: {
  botId: string;
  chatId: number;
  productName: string;
  amountCents: number;
  paymentMethod: string;
}) {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO sales (bot_id, chat_id, product_name, amount_cents, payment_method)
       VALUES ($1,$2,$3,$4,$5)`,
      [input.botId, input.chatId, input.productName, input.amountCents, input.paymentMethod]
    );
    return;
  }

  const store = await loadFileStore();
  store.sales.unshift({
    id: randomUUID(),
    botId: input.botId,
    chatId: input.chatId,
    productName: input.productName,
    amountCents: input.amountCents,
    paymentMethod: input.paymentMethod,
    status: "approved",
    createdAt: new Date().toISOString()
  });
  await saveFileStore(store);
}

export async function listLeadsByBot(botId: string) {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `SELECT chat_id, username, display_name FROM leads WHERE bot_id = $1 ORDER BY last_message_at DESC`,
      [botId]
    );
    return rows.map((r) => ({
      chatId: Number(r.chat_id),
      username: r.username as string | undefined,
      displayName: r.display_name as string | undefined
    }));
  }

  const store = await loadFileStore();
  return store.leads
    .filter((l) => l.botId === botId)
    .map((l) => ({
      chatId: l.chatId,
      username: l.username,
      displayName: l.displayName
    }));
}

export async function listLeads(limit = 100) {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `SELECT l.*, b.name AS bot_name FROM leads l
       LEFT JOIN bots b ON b.id = l.bot_id
       ORDER BY l.last_message_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }
  const store = await loadFileStore();
  return store.leads.slice(0, limit);
}

export async function listConversations(limit = 80) {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `SELECT m.*, b.name AS bot_name FROM conversation_messages m
       LEFT JOIN bots b ON b.id = m.bot_id
       ORDER BY m.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }
  const store = await loadFileStore();
  return store.messages.slice(-limit).reverse();
}

export async function listReceipts(limit = 50) {
  if (useDatabase()) {
    const { rows } = await getPool().query(
      `SELECT r.*, b.name AS bot_name FROM receipts r
       LEFT JOIN bots b ON b.id = r.bot_id
       ORDER BY r.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }
  const store = await loadFileStore();
  return store.receipts.slice(0, limit);
}

export async function listSales(limit = 50, userId?: string) {
  const botIds = await botIdsForUser(userId);
  if (userId && botIds && botIds.length === 0) return [];

  if (useDatabase()) {
    const { rows } = botIds
      ? await getPool().query(
          `SELECT s.*, b.name AS bot_name FROM sales s
           LEFT JOIN bots b ON b.id = s.bot_id
           WHERE s.bot_id = ANY($2::uuid[])
           ORDER BY s.created_at DESC LIMIT $1`,
          [limit, botIds]
        )
      : await getPool().query(
          `SELECT s.*, b.name AS bot_name FROM sales s
           LEFT JOIN bots b ON b.id = s.bot_id
           ORDER BY s.created_at DESC LIMIT $1`,
          [limit]
        );
    return rows;
  }
  const store = await loadFileStore();
  const sales = botIds ? store.sales.filter((s) => botIds.includes(s.botId)) : store.sales;
  return sales.slice(0, limit);
}

export async function salesByDay(days = 7, userId?: string) {
  const botIds = await botIdsForUser(userId);
  if (userId && botIds && botIds.length === 0) return [];

  if (useDatabase()) {
    const { rows } = botIds
      ? await getPool().query<{ day: string; total: string }>(
          `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                  COALESCE(SUM(amount_cents), 0)::text AS total
           FROM sales
           WHERE created_at >= NOW() - ($1::int || ' days')::interval
             AND bot_id = ANY($2::uuid[])
           GROUP BY 1 ORDER BY 1`,
          [days, botIds]
        )
      : await getPool().query<{ day: string; total: string }>(
          `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                  COALESCE(SUM(amount_cents), 0)::text AS total
           FROM sales
           WHERE created_at >= NOW() - ($1::int || ' days')::interval
           GROUP BY 1 ORDER BY 1`,
          [days]
        );
    return rows.map((r) => ({ day: r.day, totalCents: Number(r.total) }));
  }

  const store = await loadFileStore();
  const map = new Map<string, number>();
  const cutoff = Date.now() - days * 86400000;
  const salesRows = botIds ? store.sales.filter((s) => botIds.includes(s.botId)) : store.sales;
  for (const s of salesRows) {
    if (new Date(s.createdAt).getTime() < cutoff) continue;
    const day = s.createdAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + s.amountCents);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, totalCents]) => ({ day, totalCents }));
}

export type ActivityItem = {
  id: string;
  type: "sale" | "lead" | "receipt";
  title: string;
  subtitle: string;
  at: string;
};

export type BotSalesRank = {
  botId: string;
  name: string;
  salesCount: number;
  totalCents: number;
};

function formatSaleSubtitle(productName: string, amountCents: number, botName: string) {
  const reais = (amountCents / 100).toFixed(2).replace(".", ",");
  return `${productName} · R$ ${reais} · ${botName || "Bot"}`;
}

export async function listRecentActivity(limit = 8, userId?: string): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  const botIds = await botIdsForUser(userId);
  if (userId && botIds && botIds.length === 0) return [];

  if (useDatabase()) {
    const db = getPool();
    const scope = botIds ? " WHERE s.bot_id = ANY($2::uuid[])" : "";
    const scopeL = botIds ? " WHERE l.bot_id = ANY($2::uuid[])" : "";
    const scopeR = botIds ? " AND r.bot_id = ANY($2::uuid[])" : "";
    const params = botIds ? [limit, botIds] : [limit];
    const [sales, leads, receipts] = await Promise.all([
      db.query<{
        id: string;
        amount_cents: number;
        product_name: string;
        created_at: string;
        bot_name: string;
      }>(
        `SELECT s.id, s.amount_cents, s.product_name, s.created_at, COALESCE(b.name, 'Bot') AS bot_name
         FROM sales s LEFT JOIN bots b ON b.id = s.bot_id${scope}
         ORDER BY s.created_at DESC LIMIT $1`,
        params
      ),
      db.query<{
        id: string;
        display_name: string | null;
        username: string | null;
        last_message_at: string;
        bot_name: string;
      }>(
        `SELECT l.id, l.display_name, l.username, l.last_message_at, COALESCE(b.name, 'Bot') AS bot_name
         FROM leads l LEFT JOIN bots b ON b.id = l.bot_id${scopeL}
         ORDER BY l.last_message_at DESC LIMIT $1`,
        params
      ),
      db.query<{ id: string; created_at: string; bot_name: string }>(
        `SELECT r.id, r.created_at, COALESCE(b.name, 'Bot') AS bot_name
         FROM receipts r LEFT JOIN bots b ON b.id = r.bot_id
         WHERE r.paid = true${scopeR} ORDER BY r.created_at DESC LIMIT $1`,
        params
      )
    ]);

    for (const s of sales.rows) {
      items.push({
        id: `sale-${s.id}`,
        type: "sale",
        title: "Venda confirmada",
        subtitle: formatSaleSubtitle(s.product_name, s.amount_cents, s.bot_name),
        at: new Date(s.created_at).toISOString()
      });
    }
    for (const l of leads.rows) {
      const who = l.display_name || (l.username ? `@${l.username}` : "Novo contato");
      items.push({
        id: `lead-${l.id}`,
        type: "lead",
        title: "Novo lead",
        subtitle: `${who} · ${l.bot_name}`,
        at: new Date(l.last_message_at).toISOString()
      });
    }
    for (const r of receipts.rows) {
      items.push({
        id: `receipt-${r.id}`,
        type: "receipt",
        title: "Comprovante aprovado",
        subtitle: `Pix validado · ${r.bot_name}`,
        at: new Date(r.created_at).toISOString()
      });
    }
  } else {
    const store = await loadFileStore();
    const bots = await (await import("../bots.js")).loadBots();
    const botName = (id: string) => bots.find((b) => b.id === id)?.name ?? "Bot";

    for (const s of store.sales.slice(0, limit)) {
      items.push({
        id: `sale-${s.id}`,
        type: "sale",
        title: "Venda confirmada",
        subtitle: formatSaleSubtitle(s.productName, s.amountCents, botName(s.botId)),
        at: s.createdAt
      });
    }
    for (const l of [...store.leads].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)).slice(0, limit)) {
      const who = l.displayName || (l.username ? `@${l.username}` : "Novo contato");
      items.push({
        id: `lead-${l.id}`,
        type: "lead",
        title: "Novo lead",
        subtitle: `${who} · ${botName(l.botId)}`,
        at: l.lastMessageAt
      });
    }
    for (const r of store.receipts.filter((x) => x.paid).slice(0, limit)) {
      items.push({
        id: `receipt-${r.id}`,
        type: "receipt",
        title: "Comprovante aprovado",
        subtitle: `Pix validado · ${botName(r.botId)}`,
        at: r.createdAt
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, limit);
}

export async function salesRankingByBot(limit = 5, userId?: string): Promise<BotSalesRank[]> {
  if (useDatabase()) {
    const { rows } = userId
      ? await getPool().query<{
          bot_id: string;
          name: string;
          sales_count: number;
          total_cents: number;
        }>(
          `SELECT b.id AS bot_id, b.name,
                  COUNT(s.id)::int AS sales_count,
                  COALESCE(SUM(s.amount_cents), 0)::int AS total_cents
           FROM bots b
           INNER JOIN sales s ON s.bot_id = b.id
           WHERE b.user_id = $2
           GROUP BY b.id, b.name
           ORDER BY total_cents DESC, sales_count DESC
           LIMIT $1`,
          [limit, userId]
        )
      : await getPool().query<{
          bot_id: string;
          name: string;
          sales_count: number;
          total_cents: number;
        }>(
          `SELECT b.id AS bot_id, b.name,
                  COUNT(s.id)::int AS sales_count,
                  COALESCE(SUM(s.amount_cents), 0)::int AS total_cents
           FROM bots b
           INNER JOIN sales s ON s.bot_id = b.id
           GROUP BY b.id, b.name
           ORDER BY total_cents DESC, sales_count DESC
           LIMIT $1`,
          [limit]
        );
    return rows.map((r) => ({
      botId: r.bot_id,
      name: r.name,
      salesCount: r.sales_count,
      totalCents: r.total_cents
    }));
  }

  const store = await loadFileStore();
  const bots = await (await import("../bots.js")).loadBots(userId);
  const map = new Map<string, BotSalesRank>();
  const allowed = new Set(bots.map((b) => b.id));

  for (const s of store.sales.filter((x) => !userId || allowed.has(x.botId))) {
    const cur = map.get(s.botId) ?? {
      botId: s.botId,
      name: bots.find((b) => b.id === s.botId)?.name ?? "Bot",
      salesCount: 0,
      totalCents: 0
    };
    cur.salesCount += 1;
    cur.totalCents += s.amountCents;
    map.set(s.botId, cur);
  }

  return [...map.values()]
    .sort((a, b) => b.totalCents - a.totalCents || b.salesCount - a.salesCount)
    .slice(0, limit);
}

export async function getLatestSale(userId?: string) {
  const sales = await listSales(1, userId);
  if (sales.length === 0) return null;
  const s = sales[0] as Record<string, unknown>;
  const id = String(s.id);
  const amountCents = Number(s.amount_cents ?? s.amountCents ?? 0);
  const productName = String(s.product_name ?? s.productName ?? "Produto");
  const botName = String(s.bot_name ?? "Bot");
  const at = String(s.created_at ?? s.createdAt ?? new Date().toISOString());
  return {
    id,
    amountCents,
    productName,
    botName,
    subtitle: formatSaleSubtitle(productName, amountCents, botName),
    at
  };
}

async function botIdsForUser(userId?: string) {
  if (!userId) return null;
  const { loadBots } = await import("../bots.js");
  return (await loadBots(userId)).map((b) => b.id);
}

export async function dashboardStats(userId?: string) {
  const botIds = await botIdsForUser(userId);
  if (userId && botIds && botIds.length === 0) {
    return { leads: 0, salesTotalCents: 0, salesCount: 0, receiptsApproved: 0, messagesToday: 0 };
  }

  if (useDatabase()) {
    const db = getPool();
    const scopeWhere = botIds ? " WHERE bot_id = ANY($1::uuid[])" : "";
    const scopeAnd = botIds ? " AND bot_id = ANY($1::uuid[])" : "";
    const params = botIds ? [botIds] : [];
    const [leads, sales, receipts, messages] = await Promise.all([
      db.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM leads${scopeWhere}`, params),
      db.query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(amount_cents),0)::text AS total, COUNT(*)::text AS count FROM sales${scopeWhere}`,
        params
      ),
      db.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM receipts WHERE paid = true${scopeAnd}`,
        params
      ),
      db.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM conversation_messages WHERE created_at >= NOW() - interval '1 day'${scopeAnd}`,
        params
      )
    ]);
    return {
      leads: Number(leads.rows[0]?.c ?? 0),
      salesTotalCents: Number(sales.rows[0]?.total ?? 0),
      salesCount: Number(sales.rows[0]?.count ?? 0),
      receiptsApproved: Number(receipts.rows[0]?.c ?? 0),
      messagesToday: Number(messages.rows[0]?.c ?? 0)
    };
  }

  const store = await loadFileStore();
  const today = new Date().toISOString().slice(0, 10);
  const inScope = <T extends { botId: string }>(rows: T[]) =>
    botIds ? rows.filter((r) => botIds.includes(r.botId)) : rows;
  const leads = inScope(store.leads);
  const sales = inScope(store.sales);
  const receipts = inScope(store.receipts);
  const messages = inScope(store.messages);
  return {
    leads: leads.length,
    salesTotalCents: sales.reduce((s, x) => s + x.amountCents, 0),
    salesCount: sales.length,
    receiptsApproved: receipts.filter((r) => r.paid).length,
    messagesToday: messages.filter((m) => m.createdAt.startsWith(today)).length
  };
}

export async function listProducts(botId?: string) {
  if (useDatabase()) {
    const { rows } = botId
      ? await getPool().query(
          `SELECT p.*, b.name AS bot_name FROM products p LEFT JOIN bots b ON b.id = p.bot_id
           WHERE p.bot_id = $1 ORDER BY p.created_at DESC`,
          [botId]
        )
      : await getPool().query(
          `SELECT p.*, b.name AS bot_name FROM products p LEFT JOIN bots b ON b.id = p.bot_id ORDER BY p.created_at DESC`
        );
    return rows;
  }
  const store = await loadFileStore();
  return botId ? store.products.filter((p) => p.botId === botId) : store.products;
}

export async function saveProduct(input: { botId: string; name: string; priceCents: number }) {
  if (useDatabase()) {
    await getPool().query(
      `INSERT INTO products (bot_id, name, price_cents) VALUES ($1,$2,$3)`,
      [input.botId, input.name, input.priceCents]
    );
    return;
  }
  const store = await loadFileStore();
  store.products.push({
    id: randomUUID(),
    botId: input.botId,
    name: input.name,
    priceCents: input.priceCents,
    active: true,
    createdAt: new Date().toISOString()
  });
  await saveFileStore(store);
}
