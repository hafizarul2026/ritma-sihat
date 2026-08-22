export const NOTICE_VERSION = "2026-08-22";

export function malaysiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return value.year + "-" + value.month + "-" + value.day;
}

export function validDate(value: string | null | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function dateMinusDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function normalizeWhatsapp(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "60" + digits.slice(1);
  else if (!raw.startsWith("+") && !digits.startsWith("60")) digits = "60" + digits;

  return digits.length >= 10 && digits.length <= 15 ? "+" + digits : null;
}

export function cleanText(value: unknown, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function integerInRange(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Ralat tidak dijangka";
  console.error(message);
  return Response.json(
    { error: "Rekod tak dapat diproses. Cuba lagi." },
    { status: 500 },
  );
}