import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureSchema } from "../../../db/ensure";
import { dailyEntries, profiles } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  cleanText,
  integerInRange,
  malaysiaDate,
  routeError,
  validDate,
} from "../_lib";

type EntryPayload = {
  category?: unknown;
  label?: unknown;
  amount?: unknown;
  detail?: unknown;
  entryDate?: unknown;
  entryTime?: unknown;
  clientRequestId?: unknown;
};

const limits = {
  meal: { min: 1, max: 5000, unit: "kcal" },
  water: { min: 10, max: 3000, unit: "ml" },
  exercise: { min: 1, max: 600, unit: "min" },
} as const;

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk teruskan." }, { status: 401 });

    const payload = (await request.json()) as EntryPayload;
    const category =
      payload.category === "meal" ||
      payload.category === "water" ||
      payload.category === "exercise"
        ? payload.category
        : null;
    if (!category) return Response.json({ error: "Pilih rekod makanan, air atau senaman." }, { status: 400 });

    const amount = integerInRange(payload.amount, limits[category].min, limits[category].max);
    const label = cleanText(payload.label, 80);
    const detail = cleanText(payload.detail, 240);
    const entryDate =
      typeof payload.entryDate === "string" && validDate(payload.entryDate)
        ? payload.entryDate
        : malaysiaDate();
    const entryTime =
      typeof payload.entryTime === "string" &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(payload.entryTime)
        ? payload.entryTime
        : new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kuala_Lumpur",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date());
    const clientRequestId = cleanText(payload.clientRequestId, 80);

    if (amount === null || !label || clientRequestId.length < 8) {
      return Response.json({ error: "Lengkapkan nama dan jumlah sebelum simpan." }, { status: 400 });
    }

    await ensureSchema();
    const db = getDb();
    const [profile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, user.userId))
      .limit(1);
    if (!profile) {
      return Response.json({ error: "Lengkapkan profil sebelum tambah rekod." }, { status: 409 });
    }

    const inserted = await db
      .insert(dailyEntries)
      .values({
        userId: user.userId,
        entryDate,
        category,
        label,
        amount,
        unit: limits[category].unit,
        detail,
        clientRequestId,
        entryTime,
      })
      .onConflictDoNothing()
      .returning();

    const entry =
      inserted[0] ??
      (
        await db
          .select()
          .from(dailyEntries)
          .where(
            and(
              eq(dailyEntries.userId, user.userId),
              eq(dailyEntries.clientRequestId, clientRequestId),
            ),
          )
          .limit(1)
      )[0];

    return Response.json({ entry }, { status: inserted[0] ? 201 : 200 });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk teruskan." }, { status: 401 });

    const id = integerInRange(new URL(request.url).searchParams.get("id"), 1, 2_147_483_647);
    if (!id) return Response.json({ error: "Rekod ini tak dapat dipadam." }, { status: 400 });

    await ensureSchema();
    const db = getDb();
    const deleted = await db
      .delete(dailyEntries)
      .where(and(eq(dailyEntries.id, id), eq(dailyEntries.userId, user.userId)))
      .returning({ id: dailyEntries.id });

    if (!deleted[0]) return Response.json({ error: "Rekod ini tidak ditemui." }, { status: 404 });
    return Response.json({ deletedId: id });
  } catch (error) {
    return routeError(error);
  }
}