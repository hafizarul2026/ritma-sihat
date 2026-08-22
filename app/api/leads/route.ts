import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureSchema } from "../../../db/ensure";
import { leads } from "../../../db/schema";
import { cleanText, normalizeWhatsapp, NOTICE_VERSION, routeError } from "../_lib";

type LeadPayload = { name?: unknown; email?: unknown; whatsapp?: unknown; goal?: unknown; contactConsent?: unknown; marketingWhatsapp?: unknown; marketingEmail?: unknown };
function normalizeEmail(value: unknown) { if (typeof value !== "string") return null; const email = value.trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null; }
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LeadPayload;
    const email = normalizeEmail(payload.email); const whatsapp = normalizeWhatsapp(payload.whatsapp); const contact = email ?? whatsapp; const contactType = email ? "email" : "whatsapp";
    if (!contact) return Response.json({ error: "Masukkan e-mel atau nombor WhatsApp yang sah." }, { status: 400 });
    if (payload.contactConsent !== true) return Response.json({ error: "Persetujuan diperlukan untuk menyimpan kontak anda." }, { status: 400 });
    await ensureSchema(); const now = new Date().toISOString();
    const values = { name: cleanText(payload.name, 60), contact, contactType, goal: cleanText(payload.goal, 40), contactConsent: true, marketingWhatsapp: payload.marketingWhatsapp === true, marketingEmail: payload.marketingEmail === true, consentAt: now, noticeVersion: NOTICE_VERSION, source: "ritma-public", updatedAt: now } as const;
    const db = getDb(); await db.insert(leads).values(values).onConflictDoUpdate({ target: leads.contact, set: values });
    const [lead] = await db.select().from(leads).where(eq(leads.contact, contact)).limit(1);
    return Response.json({ lead }, { status: 201 });
  } catch (error) { return routeError(error); }
}
