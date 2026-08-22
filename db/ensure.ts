import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

const profileTableSql = [
  "CREATE TABLE IF NOT EXISTS profiles (",
  "user_id TEXT PRIMARY KEY,",
  "email TEXT NOT NULL,",
  "whatsapp TEXT NOT NULL,",
  "display_name TEXT NOT NULL DEFAULT '',",
  "day_mode TEXT NOT NULL DEFAULT 'biasa',",
  "calorie_target INTEGER NOT NULL DEFAULT 1800,",
  "water_target_ml INTEGER NOT NULL DEFAULT 2200,",
  "exercise_target_min INTEGER NOT NULL DEFAULT 30,",
  "contact_consent INTEGER NOT NULL DEFAULT 0,",
  "marketing_whatsapp INTEGER NOT NULL DEFAULT 0,",
  "marketing_email INTEGER NOT NULL DEFAULT 0,",
  "consent_at TEXT NOT NULL,",
  "notice_version TEXT NOT NULL DEFAULT '2026-08-22',",
  "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
  "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ")",
].join(" ");

const entriesTableSql = [
  "CREATE TABLE IF NOT EXISTS daily_entries (",
  "id INTEGER PRIMARY KEY AUTOINCREMENT,",
  "user_id TEXT NOT NULL,",
  "entry_date TEXT NOT NULL,",
  "category TEXT NOT NULL,",
  "label TEXT NOT NULL,",
  "amount INTEGER NOT NULL,",
  "unit TEXT NOT NULL,",
  "detail TEXT NOT NULL DEFAULT '',",
  "client_request_id TEXT NOT NULL,",
  "entry_time TEXT NOT NULL,",
  "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ")",
].join(" ");

const leadsTableSql = [
  "CREATE TABLE IF NOT EXISTS leads (",
  "id INTEGER PRIMARY KEY AUTOINCREMENT,",
  "name TEXT NOT NULL DEFAULT '',",
  "contact TEXT NOT NULL UNIQUE,",
  "contact_type TEXT NOT NULL,",
  "goal TEXT NOT NULL DEFAULT '',",
  "contact_consent INTEGER NOT NULL DEFAULT 0,",
  "marketing_whatsapp INTEGER NOT NULL DEFAULT 0,",
  "marketing_email INTEGER NOT NULL DEFAULT 0,",
  "consent_at TEXT NOT NULL,",
  "notice_version TEXT NOT NULL DEFAULT '2026-08-22',",
  "source TEXT NOT NULL DEFAULT 'ritma-public',",
  "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
  "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ")",
].join(" ");

async function initializeSchema() {
  const d1 = env.DB;
  if (!d1) throw new Error("D1 binding DB tidak tersedia.");

  await d1.batch([
    d1.prepare(profileTableSql),
    d1.prepare(entriesTableSql),
    d1.prepare(leadsTableSql),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date ON daily_entries(user_id, entry_date)",
    ),
    d1.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_entries_user_request_id ON daily_entries(user_id, client_request_id)",
    ),
  ]);
  await d1.prepare("PRAGMA optimize").run();
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = initializeSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}