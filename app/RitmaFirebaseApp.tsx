"use client";

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "./firebase";
import { LeadDialog } from "./components/LeadDialog";
import { modeLabel, modes, type DayMode } from "./ritma-data";
import { useAnimatedNumber, usePointerWash, usePrefersReducedMotion } from "./use-motion";

type Category = "meal" | "water" | "exercise";
type Profile = {
  displayName: string;
  dayMode: DayMode;
  calorieTarget: number;
  waterTargetMl: number;
  exerciseTargetMin: number;
};
type Entry = {
  id: string;
  category: Category;
  label: string;
  amount: number;
  entryDate: string;
  entryTime: string;
};

const defaults: Profile = {
  displayName: "",
  dayMode: "biasa",
  calorieTarget: 1800,
  waterTargetMl: 2000,
  exerciseTargetMin: 30,
};

const GLASS_ML = 250;
const foodPresets = [
  ["Nasi lemak (1 bungkus kecil)", 338],
  ["Nasi goreng (1 pinggan)", 386],
  ["Nasi putih (1 mangkuk)", 207],
  ["Nasi ayam (1 pinggan)", 600],
  ["Mee kari (1 mangkuk)", 549],
  ["Mee / bihun goreng (1 pinggan)", 346],
  ["Roti canai (1 keping)", 301],
  ["Capati (1 keping)", 300],
  ["Bubur ayam (1 mangkuk)", 300],
  ["Ayam goreng (1 ketul)", 260],
  ["Telur goreng (1 biji)", 90],
  ["Sayur campur (1 hidangan)", 120],
  ["Teh tarik (1 gelas)", 180],
  ["Milo ais (1 gelas)", 230],
  ["Sirap bandung (1 gelas)", 220],
  ["Kopi O kosong (1 cawan)", 5],
] as const;
const waterPresets = [
  ["Air kosong — 1 gelas", 250],
  ["Air kosong — 2 gelas", 500],
  ["Air kosong — 3 gelas", 750],
] as const;

function todayMY() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

function dateOffset(value: string, offset: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function timeMY() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value + "T12:00:00+08:00"));
}

function total(rows: Entry[], category: Category) {
  return rows.filter((row) => row.category === category).reduce((sum, row) => sum + row.amount, 0);
}

function ratioPercent(value: number, target: number) {
  return Math.round((value / Math.max(target, 1)) * 100);
}

function ringFill(value: number, target: number) {
  return Math.min(100, ratioPercent(value, target));
}

function initials(value: string) {
  return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}

function demoEntries(today: string): Entry[] {
  const rows = [
    [0, "meal", "Sarapan roti bakar", 420, "08:10"],
    [0, "water", "Air kosong — 3 gelas", 750, "09:30"],
    [0, "exercise", "Berjalan tengah hari", 18, "12:45"],
    [0, "meal", "Nasi campur saya", 680, "13:05"],
    [0, "water", "Air kosong — 3 gelas", 750, "14:20"],
    [-1, "meal", "Nasi lemak + telur", 490, "08:25"],
    [-1, "water", "Air kosong — 8 gelas", 2000, "20:10"],
    [-1, "exercise", "Jalan santai", 32, "18:20"],
    [-2, "meal", "Hidangan harian", 1650, "20:00"],
    [-2, "water", "Air kosong — 7 gelas", 1750, "20:30"],
    [-2, "exercise", "Kemas rumah", 25, "17:10"],
    [-3, "meal", "Hidangan harian", 1810, "20:00"],
    [-3, "water", "Air kosong — 9 gelas", 2250, "21:00"],
    [-3, "exercise", "Berjalan", 35, "18:00"],
  ] as const;

  return rows.map((row, index) => ({
    id: "demo-" + index,
    category: row[1],
    label: row[2],
    amount: row[3],
    entryDate: dateOffset(today, row[0]),
    entryTime: row[4],
  }));
}

function heroCopy(mealCount: number, calories: number, target: number) {
  if (mealCount === 0) return "Kalori kena pantau.";
  if (calories > target) return "Kalori dah lebih sasaran.";
  if (calories >= target * 0.85) return "Hari ini dalam kawalan.";
  return "Rekod dah bermula.";
}

export default function RitmaFirebaseApp() {
  const today = useMemo(todayMY, []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(defaults);
  const [entries, setEntries] = useState<Entry[]>(() => demoEntries(today));
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [category, setCategory] = useState<Category>("meal");
  const [toast, setToast] = useState("");
  const [undoEntry, setUndoEntry] = useState<Entry | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [quickPreset, setQuickPreset] = useState<{ label: string; amount: number } | null>(null);
  const [waterRipple, setWaterRipple] = useState<number | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const shellRef = usePointerWash(!reduceMotion);

  useEffect(() => onAuthStateChanged(firebaseAuth, (current) => {
    setUser(current);
  }), []);

  useEffect(() => {
    if (!user) {
      setEntries(demoEntries(today));
      setProfile(defaults);
      return;
    }
    setEntries([]);
    setProfile(defaults);
    const profileRef = doc(firebaseDb, "users", user.uid);
    const stopProfile = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data() as Partial<Profile> | undefined;
      if (data) setProfile({ ...defaults, ...data });
      else {
        void setDoc(profileRef, {
          ...defaults,
          displayName: user.displayName || user.email?.split("@")[0] || "",
          email: user.email || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    });
    const stopEntries = onSnapshot(collection(firebaseDb, "users", user.uid, "entries"), (snapshot) => {
      setEntries(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Entry, "id">) })));
    });
    return () => {
      stopProfile();
      stopEntries();
    };
  }, [user, today]);

  const todayEntries = entries.filter((entry) => entry.entryDate === today);
  const calories = total(todayEntries, "meal");
  const water = total(todayEntries, "water");
  const exercise = total(todayEntries, "exercise");
  const mealCount = todayEntries.filter((entry) => entry.category === "meal").length;
  const calorieOver = calories > profile.calorieTarget;
  const metrics = [
    {
      category: "meal" as const,
      label: "Kalori",
      value: calories.toLocaleString("ms-MY"),
      target: profile.calorieTarget + " kcal",
      valueTarget: profile.calorieTarget,
      tone: "coral",
      over: calorieOver,
    },
    {
      category: "water" as const,
      label: "Air kosong",
      value: Math.round(water / GLASS_ML) + " gelas",
      target: Math.round(profile.waterTargetMl / GLASS_ML) + " gelas",
      valueTarget: profile.waterTargetMl,
      tone: "aqua",
      over: false,
    },
    {
      category: "exercise" as const,
      label: "Senaman",
      value: exercise + " min",
      target: profile.exerciseTargetMin + " min",
      valueTarget: profile.exerciseTargetMin,
      tone: "lime",
      over: false,
    },
  ];
  const score = Math.round(metrics.reduce((sum, metric) => {
    const raw = ratioPercent(total(todayEntries, metric.category), metric.valueTarget);
    if (metric.category === "meal" && raw > 100) return sum + Math.max(0, 200 - raw);
    return sum + Math.min(100, raw);
  }, 0) / 3);
  const mealFill = ringFill(calories, profile.calorieTarget);
  const waterFill = ringFill(water, profile.waterTargetMl);
  const exerciseFill = ringFill(exercise, profile.exerciseTargetMin);
  const mealRaw = ratioPercent(calories, profile.calorieTarget);
  const waterRaw = ratioPercent(water, profile.waterTargetMl);
  const exerciseRaw = ratioPercent(exercise, profile.exerciseTargetMin);
  const mealRing = useAnimatedNumber(mealFill, 700, !reduceMotion);
  const waterRing = useAnimatedNumber(waterFill, 700, !reduceMotion);
  const exerciseRing = useAnimatedNumber(exerciseFill, 700, !reduceMotion);
  const mealLabel = useAnimatedNumber(calorieOver ? mealRaw : mealFill, 700, !reduceMotion);
  const waterLabel = useAnimatedNumber(waterFill, 700, !reduceMotion);
  const exerciseLabel = useAnimatedNumber(exerciseFill, 700, !reduceMotion);
  const scoreShown = useAnimatedNumber(score, 700, !reduceMotion);
  const modeIndex = Math.max(0, modes.findIndex((mode) => mode.value === profile.dayMode));
  const ringMotion = {
    meal: { fill: mealRing, label: mealLabel },
    water: { fill: waterRing, label: waterLabel },
    exercise: { fill: exerciseRing, label: exerciseLabel },
  } as const;

  const recommendation = useMemo(() => {
    const waterProgress = ringFill(water, profile.waterTargetMl);
    const exerciseProgress = ringFill(exercise, profile.exerciseTargetMin);

    if (calorieOver) {
      return {
        category: "water" as const,
        title: "Kalori hari ini dah lebih sasaran.",
        reason: "Teruskan air dan senaman; elak tambah hidangan jika boleh.",
      };
    }
    if (waterProgress < 70) {
      if (profile.dayMode === "puasa") {
        return {
          category: "water" as const,
          title: "Cuba minum satu gelas air selepas berbuka.",
          reason: "Jumlah air hari ini masih di bawah sasaran.",
        };
      }
      if (profile.dayMode === "kerja_luar") {
        return {
          category: "water" as const,
          title: "Minum satu gelas air bila ada masa rehat.",
          reason: "Semasa kerja luar, cuba minum sedikit demi sedikit.",
        };
      }
      return {
        category: "water" as const,
        title: "Tambah satu gelas air.",
        reason: "Jumlah air hari ini masih di bawah sasaran.",
      };
    }
    if (exerciseProgress < 70) {
      return {
        category: "exercise" as const,
        title: "Cuba senaman ringan selama 10 minit.",
        reason: "Senaman ringan selama 10 minit pun dikira.",
      };
    }
    if (!mealCount) {
      return {
        category: "meal" as const,
        title: "Masukkan anggaran kalori makanan anda.",
        reason: "Tak perlu terlalu tepat; anggaran pun memadai.",
      };
    }
    return {
      category: "water" as const,
      title: "Teruskan rutin anda hari ini.",
      reason: "Catat sedikit demi sedikit untuk lihat ritma sebenar.",
    };
  }, [calorieOver, mealCount, profile.dayMode, profile.waterTargetMl, water, exercise, profile.exerciseTargetMin]);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => dateOffset(today, index - 6)).map((date) => {
        const dayEntries = entries.filter((entry) => entry.entryDate === date);
        const dayScore = Math.round(
          (ringFill(total(dayEntries, "meal"), profile.calorieTarget) +
            ringFill(total(dayEntries, "water"), profile.waterTargetMl) +
            ringFill(total(dayEntries, "exercise"), profile.exerciseTargetMin)) /
            3,
        );
        return {
          date,
          score: dayScore,
          label: new Intl.DateTimeFormat("ms-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            weekday: "short",
          }).format(new Date(date + "T12:00:00+08:00")),
        };
      }),
    [entries, profile.calorieTarget, profile.exerciseTargetMin, profile.waterTargetMl, today],
  );

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setAuthError("");
    setSaving(true);
    try {
      if (authMode === "signup") {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await setDoc(doc(firebaseDb, "users", credential.user.uid), { email }, { merge: true });
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
      setAuthOpen(false);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setAuthError(code.includes("email-already-in-use") ? "E-mel ini sudah berdaftar. Cuba log masuk." : code.includes("invalid-credential") ? "E-mel atau kata laluan tidak tepat." : "Tidak dapat meneruskan. Gunakan e-mel sah dan kata laluan sekurang-kurangnya 6 aksara.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Profile = {
      displayName: String(data.get("displayName") || "").trim(),
      dayMode: String(data.get("dayMode") || "biasa") as DayMode,
      calorieTarget: Number(data.get("calorieTarget") || 1800),
      waterTargetMl: Number(data.get("waterGlasses") || 8) * GLASS_ML,
      exerciseTargetMin: Number(data.get("exerciseTargetMin") || 30),
    };
    if (!user) {
      setProfile(next);
      setToast("Tetapan demo dikemas kini untuk sesi ini.");
      return;
    }
    await setDoc(doc(firebaseDb, "users", user.uid), { ...next, email: user.email || "", updatedAt: serverTimestamp() }, { merge: true });
    setToast("Profil dan sasaran disimpan.");
  }

  async function changeMode(mode: DayMode) {
    setProfile((current) => ({ ...current, dayMode: mode }));
    if (user) {
      await setDoc(doc(firebaseDb, "users", user.uid), { dayMode: mode }, { merge: true });
    }
  }

  async function persistEntry(entry: Omit<Entry, "id">) {
    if (!user) {
      const local: Entry = { ...entry, id: "demo-" + Date.now() };
      setEntries((current) => [...current, local]);
      return;
    }
    await addDoc(collection(firebaseDb, "users", user.uid, "entries"), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = quickPreset?.label || String(data.get("label") || "").trim();
    const amount = quickPreset?.amount || Number(data.get("amount") || 0);
    if (!label || amount <= 0) {
      setToast("Pilih senarai cepat atau masukkan butiran rekod.");
      return;
    }
    await persistEntry({
      category,
      label,
      amount,
      entryDate: today,
      entryTime: timeMY(),
    });
    setEntryOpen(false);
    setQuickPreset(null);
    setToast(user ? "Rekod disimpan." : "Rekod contoh ditambah untuk sesi ini.");
  }

  async function addQuickWater(glasses: number) {
    setWaterRipple(glasses);
    window.setTimeout(() => setWaterRipple(null), 220);
    await persistEntry({
      category: "water",
      label: "Air kosong — " + glasses + " gelas",
      amount: glasses * GLASS_ML,
      entryDate: today,
      entryTime: timeMY(),
    });
    setToast(glasses + " gelas air ditambah.");
  }

  async function removeEntry(entry: Entry) {
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setUndoEntry(entry);
    setToast("Rekod dipadam. Ketik Undur jika tersilap.");
    if (user && !entry.id.startsWith("demo-")) {
      await deleteDoc(doc(firebaseDb, "users", user.uid, "entries", entry.id));
    }
  }

  async function undoDelete() {
    if (!undoEntry) return;
    const restored = undoEntry;
    setUndoEntry(null);
    setToast("");
    if (user && !restored.id.startsWith("demo-")) {
      await addDoc(collection(firebaseDb, "users", user.uid, "entries"), {
        category: restored.category,
        label: restored.label,
        amount: restored.amount,
        entryDate: restored.entryDate,
        entryTime: restored.entryTime,
        createdAt: serverTimestamp(),
      });
      return;
    }
    setEntries((current) => [...current, restored]);
  }

  function recapText() {
    return (
      "Rekod hari ini: " + calories + "/" + profile.calorieTarget +
      " kcal, " + Math.round(water / GLASS_ML) + "/" +
      Math.round(profile.waterTargetMl / GLASS_ML) + " gelas air, " +
      exercise + "/" + profile.exerciseTargetMin + " min senaman."
    );
  }

  function shareWhatsapp() {
    window.open("https://wa.me/?text=" + encodeURIComponent(recapText()), "_blank", "noopener,noreferrer");
  }

  async function copyRecap() {
    try {
      await navigator.clipboard.writeText(recapText());
      setToast("Ringkasan disalin.");
    } catch {
      setToast("Salinan tidak berjaya pada pelayar ini.");
    }
  }

  function openLog(next: Category) {
    setQuickPreset(null);
    setCategory(next);
    setEntryOpen(true);
  }

  function closeToast() {
    setToast("");
    setUndoEntry(null);
  }

  return (
    <main className="app-shell" ref={shellRef}>
      <nav className="topbar" aria-label="Navigasi utama">
        <a className="brand" href="#top" aria-label="Ritma — laman utama">ritma<span>.</span></a>
        <div className="nav-actions">
          <p className="date-label">{formatDate(today)}</p>
          {user ? (
            <div className="account-menu">
              <button
                className="avatar-button"
                type="button"
                onClick={() => document.getElementById("profil")?.scrollIntoView({ behavior: "smooth" })}
                aria-label="Buka tetapan profil"
              >
                {initials(profile.displayName || user.email || "R")}
              </button>
              <button className="text-button" type="button" onClick={() => void signOut(firebaseAuth)}>Keluar</button>
            </div>
          ) : (
            <button className="dark-button" type="button" onClick={() => setAuthOpen(true)}>Masuk / daftar</button>
          )}
        </div>
      </nav>

      {!user && (
        <aside className="demo-banner" aria-label="Makluman mod demo">
          <span>MOD DEMO</span>
          <p>Cuba tanpa akaun.</p>
          <button type="button" onClick={() => setAuthOpen(true)}>Masuk untuk simpan</button>
        </aside>
      )}

      <section className="dashboard" id="top">
        <header className="hero-copy">
          <div>
            <p className="eyebrow">HARI INI · {modeLabel(profile.dayMode).toUpperCase()}</p>
            <h1>{heroCopy(mealCount, calories, profile.calorieTarget)}</h1>
          </div>
          <div className="hero-side">
            <p>
              {user
                ? "Rekod anda disimpan secara peribadi pada akaun e-mel ini."
                : "Catat kalori, air dan senaman, sama ada hari biasa, puasa atau kerja luar."}
            </p>
            <div className="mode-switcher" aria-label="Pilih rutin">
              <span className="mode-thumb" style={{ transform: "translateX(" + modeIndex * 100 + "%)" }} aria-hidden="true" />
              {modes.map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  className={profile.dayMode === mode.value ? "active" : ""}
                  aria-pressed={profile.dayMode === mode.value}
                  title={mode.hint}
                  onClick={() => void changeMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="pulse-card" aria-labelledby="pulse-title">
          <div className="pulse-heading">
            <div>
              <p className="kicker">3 SASARAN HARI INI</p>
              <h2 id="pulse-title">
                {calorieOver
                  ? "Kalori melebihi sasaran hari ini."
                  : score >= 90
                    ? "Ritma anda sangat baik hari ini."
                    : "Teruskan sedikit demi sedikit."}
              </h2>
            </div>
            <div className="score" aria-label={"Skor hari ini " + score + " daripada 100"}>
              <strong>{Math.round(scoreShown)}</strong>
              <span>/100</span>
            </div>
          </div>
          <div className="metric-grid">
            {metrics.map((metric) => {
              const motion = ringMotion[metric.category];
              const ringLabel = Math.round(motion.label) + "%";
              return (
                <article className="metric" key={metric.category}>
                  <div
                    className={"ring " + metric.tone + (metric.over ? " over" : "")}
                    style={{ "--progress": motion.fill + "%" } as CSSProperties}
                    aria-hidden="true"
                  >
                    <span>{ringLabel}</span>
                  </div>
                  <div className="metric-copy">
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                    <small> / {metric.target}{metric.over ? " · melebihi" : ""}</small>
                    {metric.category === "water" && (
                      <div className="water-quick">
                        <span>Tambah terus</span>
                        <div>
                          <button type="button" className={waterRipple === 1 ? "is-rippling" : ""} onClick={() => void addQuickWater(1)}>+1 gelas</button>
                          <button type="button" className={waterRipple === 2 ? "is-rippling" : ""} onClick={() => void addQuickWater(2)}>+2 gelas</button>
                          <button type="button" className={waterRipple === 3 ? "is-rippling" : ""} onClick={() => void addQuickWater(3)}>+3 gelas</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="metric-add"
                    onClick={() => openLog(metric.category)}
                    aria-label={metric.category === "meal" ? "Catat makanan" : metric.category === "water" ? "Tambah air" : "Catat senaman"}
                  >
                    +
                  </button>
                </article>
              );
            })}
          </div>
          <div className="next-action">
            <span className="arrow" aria-hidden="true">—</span>
            <div>
              <p>Cadangan seterusnya</p>
              <strong>{recommendation.title}</strong>
              <small>{recommendation.reason}</small>
            </div>
            <button className="primary-button" type="button" onClick={() => openLog(recommendation.category)}>Catat sekarang</button>
          </div>
        </section>

        <div className="lower-grid">
          <section className="rhythm-card" aria-labelledby="timeline-title">
            <div className="section-heading">
              <div>
                <p className="kicker">REKOD HARI INI</p>
                <h2 id="timeline-title">Makanan, air dan senaman anda.</h2>
              </div>
              <button type="button" className="text-button" onClick={() => openLog("meal")}>+ Tambah</button>
            </div>
            {todayEntries.length ? (
              <ol className="entry-list">
                {[...todayEntries].sort((a, b) => a.entryTime.localeCompare(b.entryTime)).map((entry) => (
                  <li key={entry.id}>
                    <span className={"entry-dot " + entry.category} aria-hidden="true" />
                    <time>{entry.entryTime}</time>
                    <div>
                      <strong>{entry.label}</strong>
                      <small>
                        {entry.amount.toLocaleString("ms-MY")}{" "}
                        {entry.category === "meal" ? "kcal" : entry.category === "water" ? "ml" : "min"}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeEntry(entry)}
                      aria-label={"Padam " + entry.label}
                    >
                      Padam
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state">
                <strong>Belum ada rekod.</strong>
                <p>Mula dengan satu catatan kecil untuk hari ini.</p>
              </div>
            )}
          </section>

          <section className="week-card" aria-labelledby="week-title">
            <div>
              <p className="kicker">7 HARI TERKINI</p>
              <h2 id="week-title">Ringkasan 7 hari anda.</h2>
            </div>
            <div className="week-bars" aria-label="Ringkasan skor tujuh hari">
              {week.map((day) => (
                <div className="week-day" key={day.date} title={day.label + " · " + day.score + "%"}>
                  <div className="bar-track"><span style={{ height: Math.max(6, day.score) + "%" }} /></div>
                  <strong>{day.label}</strong>
                  <small>{day.score}%</small>
                </div>
              ))}
            </div>
            <div className="share-actions">
              <button type="button" onClick={shareWhatsapp}>Kongsi di WhatsApp</button>
              <button type="button" onClick={() => void copyRecap()}>Salin ringkasan</button>
            </div>
          </section>
        </div>

        <section className="week-card profile-card" id="profil">
          <p className="kicker">PROFIL & SASARAN</p>
          <h2>Tetapan peribadi anda.</h2>
          <form className="profile-form" key={user?.uid ?? "demo"} onSubmit={(event) => void saveProfile(event)}>
            <label>
              Nama paparan
              <input name="displayName" defaultValue={profile.displayName} />
            </label>
            <label>
              Sasaran kalori
              <input name="calorieTarget" type="number" min="1" defaultValue={profile.calorieTarget} />
            </label>
            <label>
              Sasaran air (gelas sehari)
              <input name="waterGlasses" type="number" min="1" defaultValue={Math.round(profile.waterTargetMl / GLASS_ML)} />
            </label>
            <label>
              Sasaran senaman (min)
              <input name="exerciseTargetMin" type="number" min="1" defaultValue={profile.exerciseTargetMin} />
            </label>
            <input type="hidden" name="dayMode" value={profile.dayMode} />
            <button className="profile-submit" type="submit">Simpan tetapan</button>
          </form>
          <button type="button" className="text-button ebook-quiet" onClick={() => setLeadOpen(true)}>
            Ebook diet percuma
          </button>
        </section>

        <footer className="app-footer">
          <p>
            <strong>Semua angka ialah anggaran.</strong> Nilai hidangan berubah mengikut saiz dan resipi.
            Jika anda hamil, ada sekatan cecair atau masalah kesihatan, semak sasaran dengan profesional kesihatan.
            Ritma bukan alat diagnosis atau nasihat perubatan.
          </p>
          <button type="button" onClick={() => setLeadOpen(true)}>Ebook diet percuma</button>
        </footer>
      </section>

      {authOpen && !user && (
        <div className="dialog-backdrop">
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="close-button" type="button" onClick={() => setAuthOpen(false)} aria-label="Tutup">×</button>
            <p className="kicker">RITMA SEBENAR</p>
            <h2 id="auth-title">{authMode === "signup" ? "Simpan rekod anda dengan akaun e-mel." : "Selamat kembali."}</h2>
            <p className="dialog-intro">Rekod kalori, air dan senaman hanya boleh diakses oleh akaun anda. Atau teruskan dalam mod demo tanpa daftar.</p>
            <form className="profile-form" onSubmit={(event) => void submitAuth(event)}>
              <label>E-mel<input name="email" type="email" autoComplete="email" required /></label>
              <label>
                Kata laluan
                <input
                  name="password"
                  type="password"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </label>
              {authError && <p className="helper" role="alert">{authError}</p>}
              <button className="profile-submit" type="submit" disabled={saving}>
                {saving ? "Sedang diproses…" : authMode === "signup" ? "Daftar & mula" : "Log masuk"}
              </button>
            </form>
            <button className="text-button" type="button" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>
              {authMode === "signup" ? "Sudah ada akaun? Log masuk" : "Belum ada akaun? Daftar"}
            </button>
            <button className="text-button" type="button" onClick={() => setAuthOpen(false)}>
              Cuba tanpa akaun
            </button>
          </section>
        </div>
      )}

      {leadOpen && <LeadDialog onClose={() => setLeadOpen(false)} />}

      {entryOpen && (
        <div className="dialog-backdrop">
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="log-title">
            <button className="close-button" type="button" onClick={() => setEntryOpen(false)} aria-label="Tutup">×</button>
            <p className="kicker">CATAT HARI INI</p>
            <h2 id="log-title">Tambah rekod</h2>
            <div className="log-tabs" role="tablist" aria-label="Jenis catatan">
              {(["meal", "water", "exercise"] as Category[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? "active" : ""}
                  onClick={() => {
                    setQuickPreset(null);
                    setCategory(item);
                  }}
                >
                  {item === "meal" ? "Makanan" : item === "water" ? "Air" : "Senaman"}
                </button>
              ))}
            </div>
            <form className="profile-form" onSubmit={(event) => void addEntry(event)}>
              {category === "meal" && (
                <>
                  <p className="field-label">PILIH MAKANAN / MINUMAN HALAL BIASA</p>
                  <div className="quick-grid">
                    {foodPresets.map(([label, amount]) => (
                      <button
                        type="button"
                        key={label}
                        aria-pressed={quickPreset?.label === label}
                        onClick={() => setQuickPreset({ label, amount })}
                      >
                        <strong>{label}</strong>
                        <span>{amount} kcal · anggaran</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {category === "water" && (
                <>
                  <p className="field-label">PILIH JUMLAH AIR KOSONG</p>
                  <div className="amount-grid">
                    {waterPresets.map(([label, amount], index) => (
                      <button
                        type="button"
                        key={label}
                        aria-pressed={quickPreset?.label === label}
                        onClick={() => setQuickPreset({ label, amount })}
                      >
                        <strong>{index + 1} gelas</strong>
                        <span>{amount} ml</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {quickPreset && category !== "exercise" && (
                <p className="helper">
                  <strong>Dipilih:</strong> {quickPreset.label} · {quickPreset.amount}
                  {category === "meal" ? " kcal" : " ml"}
                </p>
              )}
              <label>
                {category === "meal" ? "Makanan lain (jika tiada dalam senarai)" : category === "water" ? "Jumlah lain (jika tiada di atas)" : "Aktiviti"}
                <input
                  name="label"
                  required={category === "exercise"}
                  placeholder={category === "meal" ? "Contoh: Nasi campur" : category === "water" ? "Contoh: Botol air sendiri" : "Contoh: Berjalan"}
                />
              </label>
              <label>
                {category === "meal" ? "Kalori lain (kcal)" : category === "water" ? "Jumlah lain (ml)" : "Tempoh (minit)"}
                <input name="amount" type="number" min="1" required={category === "exercise"} />
              </label>
              <p className="helper">
                {category === "meal"
                  ? "Pilih satu kad di atas untuk simpan tanpa mengisi angka."
                  : category === "water"
                    ? "1 gelas bersamaan 250 ml."
                    : "Masukkan tempoh aktiviti anda."}
              </p>
              <button className="profile-submit" type="submit">Simpan rekod</button>
            </form>
          </section>
        </div>
      )}

      <div className="toast" role="status" aria-live="polite">
        {toast && (
          <div className="toast-card">
            <p>{toast}</p>
            {undoEntry && (
              <button type="button" className="toast-undo" onClick={() => void undoDelete()}>
                Undur
              </button>
            )}
            <button type="button" className="toast-dismiss" onClick={closeToast} aria-label="Tutup notis">
              ×
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
