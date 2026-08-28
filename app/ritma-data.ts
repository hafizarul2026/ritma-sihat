export type DayMode = "biasa" | "puasa" | "kerja_luar";
export type Category = "meal" | "water" | "exercise";

export type AuthUser = {
  userId: string;
  email: string;
  displayName: string;
};

export type Profile = {
  userId: string;
  email: string;
  whatsapp: string;
  displayName: string;
  dayMode: DayMode;
  calorieTarget: number;
  waterTargetMl: number;
  exerciseTargetMin: number;
  contactConsent: boolean;
  marketingWhatsapp: boolean;
  marketingEmail: boolean;
};

export type ProfileInput = Omit<Profile, "userId" | "email">;

export type Entry = {
  id: number;
  userId: string;
  entryDate: string;
  category: Category;
  label: string;
  amount: number;
  unit: "kcal" | "ml" | "min";
  detail: string;
  clientRequestId: string;
  entryTime: string;
  createdAt: string;
};

export type NewEntry = Pick<Entry, "category" | "label" | "amount" | "detail">;

export const DEFAULT_PROFILE: Profile = {
  userId: "demo",
  email: "",
  whatsapp: "",
  displayName: "",
  dayMode: "biasa",
  calorieTarget: 1800,
  waterTargetMl: 2200,
  exerciseTargetMin: 30,
  contactConsent: false,
  marketingWhatsapp: false,
  marketingEmail: false,
};

export const modes: Array<{ value: DayMode; label: string; hint: string }> = [
  { value: "biasa", label: "Biasa", hint: "Untuk rutin harian biasa" },
  { value: "puasa", label: "Puasa", hint: "Untuk waktu sahur dan berbuka" },
  { value: "kerja_luar", label: "Kerja luar", hint: "Untuk hari yang banyak bergerak di luar" },
];

export function modeLabel(mode: DayMode): string {
  return modes.find((item) => item.value === mode)?.label ?? "Biasa";
}