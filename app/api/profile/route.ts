import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureSchema } from "../../../db/ensure";
import { profiles } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  cleanText,
  integerInRange,
  normalizeWhatsapp,
  NOTICE_VERSION,
  routeError,
} from "../_lib";

type ProfilePayload = {
  whatsapp?: unknown;
  displayName?: unknown;
  dayMode?: unknown;
  calorieTarget?: unknown;
  waterTargetMl?: unknown;
  exerciseTargetMin?: unknown;
  contactConsent?: unknown;
  marketingWhatsapp?: unknown;
  marketingEmail?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk teruskan." }, { status: 401 });

    const payload = (await request.json()) as ProfilePayload;
    const whatsapp = normalizeWhatsapp(payload.whatsapp);
    const calorieTarget = integerInRange(payload.calorieTarget, 800, 6000);
    const waterTargetMl = integerInRange(payload.waterTargetMl, 500, 8000);
    const exerciseTargetMin = integerInRange(payload.exerciseTargetMin, 0, 600);
    const dayMode =
      payload.dayMode === "puasa" || payload.dayMode === "kerja_luar"
        ? payload.dayMode
        : "biasa";

    if (!whatsapp) {
      return Response.json({ error: "Masukkan nombor WhatsApp yang sah." }, { status: 400 });
    }
    if (!calorieTarget || !waterTargetMl || exerciseTargetMin === null) {
      return Response.json({ error: "Semak sasaran kalori, air dan senaman yang dimasukkan." }, { status: 400 });
    }
    if (payload.contactConsent !== true) {
      return Response.json(
        { error: "Tandakan persetujuan untuk menyimpan maklumat akaun." },
        { status: 400 },
      );
    }

    await ensureSchema();
    const db = getDb();
    const now = new Date().toISOString();
    const values = {
      userId: user.userId,
      email: user.email,
      whatsapp,
      displayName: cleanText(payload.displayName, 60),
      dayMode,
      calorieTarget,
      waterTargetMl,
      exerciseTargetMin,
      contactConsent: true,
      marketingWhatsapp: payload.marketingWhatsapp === true,
      marketingEmail: payload.marketingEmail === true,
      consentAt: now,
      noticeVersion: NOTICE_VERSION,
      updatedAt: now,
    } as const;

    await db
      .insert(profiles)
      .values(values)
      .onConflictDoUpdate({ target: profiles.userId, set: values });

    const [saved] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.userId))
      .limit(1);

    return Response.json({ profile: saved });
  } catch (error) {
    return routeError(error);
  }
}