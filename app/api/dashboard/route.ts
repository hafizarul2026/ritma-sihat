import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureSchema } from "../../../db/ensure";
import { dailyEntries, profiles } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { dateMinusDays, malaysiaDate, routeError, validDate } from "../_lib";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk teruskan." }, { status: 401 });

    await ensureSchema();
    const requestedDate = new URL(request.url).searchParams.get("date");
    const today = validDate(requestedDate) ? requestedDate! : malaysiaDate();
    const since = dateMinusDays(today, 6);
    const db = getDb();

    const [profileRows, entries] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1),
      db
        .select()
        .from(dailyEntries)
        .where(
          and(
            eq(dailyEntries.userId, user.userId),
            gte(dailyEntries.entryDate, since),
            lte(dailyEntries.entryDate, today),
          ),
        )
        .orderBy(asc(dailyEntries.entryDate), asc(dailyEntries.entryTime)),
    ]);

    return Response.json({
      profile: profileRows[0] ?? null,
      entries,
      today,
      user: { email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    return routeError(error);
  }
}