import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const currentTimestamp = sql.raw("CURRENT_TIMESTAMP");

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  displayName: text("display_name").notNull().default(""),
  dayMode: text("day_mode", { enum: ["biasa", "puasa", "kerja_luar"] }).notNull().default("biasa"),
  calorieTarget: integer("calorie_target").notNull().default(1800),
  waterTargetMl: integer("water_target_ml").notNull().default(2200),
  exerciseTargetMin: integer("exercise_target_min").notNull().default(30),
  contactConsent: integer("contact_consent", { mode: "boolean" }).notNull().default(false),
  marketingWhatsapp: integer("marketing_whatsapp", { mode: "boolean" }).notNull().default(false),
  marketingEmail: integer("marketing_email", { mode: "boolean" }).notNull().default(false),
  consentAt: text("consent_at").notNull(),
  noticeVersion: text("notice_version").notNull().default("2026-08-22"),
  createdAt: text("created_at").notNull().default(currentTimestamp),
  updatedAt: text("updated_at").notNull().default(currentTimestamp),
});

export const dailyEntries = sqliteTable(
  "daily_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    entryDate: text("entry_date").notNull(),
    category: text("category", { enum: ["meal", "water", "exercise"] }).notNull(),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    unit: text("unit", { enum: ["kcal", "ml", "min"] }).notNull(),
    detail: text("detail").notNull().default(""),
    clientRequestId: text("client_request_id").notNull(),
    entryTime: text("entry_time").notNull(),
    createdAt: text("created_at").notNull().default(currentTimestamp),
  },
  (table) => [
    index("idx_daily_entries_user_date").on(table.userId, table.entryDate),
    uniqueIndex("idx_daily_entries_user_request_id").on(
      table.userId,
      table.clientRequestId,
    ),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;