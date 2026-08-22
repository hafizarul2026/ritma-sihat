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

type Mode = "biasa" | "puasa" | "kerja_luar";
type Category = "meal" | "water" | "exercise";
type Profile = {
  displayName: string;
  dayMode: Mode;
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
  waterTargetMl: 2200,
  exerciseTargetMin: 30,
};

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
function timeMY() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
function total(rows: Entry[], category: Category) {
  return rows.filter((row) => row.category === category).reduce((sum, row) => sum + row.amount, 0);
}
function progress(value: number, target: number) {
  return Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
}
function initials(value: string) {
  return value.split(/[\\s@._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}

export default function RitmaFirebaseApp() {
  const today = useMemo(todayMY, []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(defaults);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authOpen, setAuthOpen] = useState(true);
  const [authError, setAuthError] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [category, setCategory] = useState<Category>("meal");
  const [toast, setToast] = useState("");

  useEffect(() => onAuthStateChanged(firebaseAuth, (current) => {
    setUser(current);
    setLoading(false);
    setAuthOpen(!current);
  }), []);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setProfile(defaults);
      return;
    }
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
  }, [user]);

  const todayEntries = entries.filter((entry) => entry.entryDate === today);
  const calories = total(todayEntries, "meal");
  const water = total(todayEntries, "water");
  const exercise = total(todayEntries, "exercise");
  const metrics = [
    { category: "meal" as const, label: "Kalori", value: calories.toLocaleString("ms-MY"), target: profile.calorieTarget + " kcal", valueTarget: profile.calorieTarget, tone: "coral" },
    { category: "water" as const, label: "Air", value: (water / 1000).toFixed(1) + " L", target: (profile.waterTargetMl / 1000).toFixed(1) + " L", valueTarget: profile.waterTargetMl, tone: "aqua" },
    { category: "exercise" as const, label: "Senaman", value: exercise + " min", target: profile.exerciseTargetMin + " min", valueTarget: profile.exerciseTargetMin, tone: "lime" },
  ];
  const score = Math.round(metrics.reduce((sum, metric) => sum + progress(total(todayEntries, metric.category), metric.valueTarget), 0) / 3);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setAuthError("");
    setSaving(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setAuthError(code.includes("email-already-in-use") ? "E-mel ini sudah berdaftar. Cuba log masuk." : code.includes("invalid-credential") ? "E-mel atau kata laluan tidak tepat." : "Tidak dapat meneruskan. Gunakan e-mel sah dan kata laluan sekurang-kurangnya 6 aksara.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const data = new FormData(event.currentTarget);
    const next: Profile = {
      displayName: String(data.get("displayName") || "").trim(),
      dayMode: String(data.get("dayMode") || "biasa") as Mode,
      calorieTarget: Number(data.get("calorieTarget") || 1800),
      waterTargetMl: Number(data.get("waterTargetMl") || 2200),
      exerciseTargetMin: Number(data.get("exerciseTargetMin") || 30),
    };
    await setDoc(doc(firebaseDb, "users", user.uid), { ...next, email: user.email || "", updatedAt: serverTimestamp() }, { merge: true });
    setToast("Profil dan sasaran disimpan.");
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") || "").trim();
    const amount = Number(data.get("amount") || 0);
    if (!label || amount <= 0) return;
    await addDoc(collection(firebaseDb, "users", user.uid, "entries"), {
      category,
      label,
      amount,
      entryDate: today,
      entryTime: timeMY(),
      createdAt: serverTimestamp(),
    });
    setEntryOpen(false);
    setToast("Rekod disimpan.");
  }

  if (loading) return <main className="app-shell"><p className="date-label">Memuatkan Ritma…</p></main>;

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#top">ritma<span>.</span></a>
        {user ? <div className="account-menu"><button className="avatar-button" onClick={() => document.getElementById("profil")?.scrollIntoView({ behavior: "smooth" })}>{initials(profile.displayName || user.email || "R")}</button><button className="text-button" onClick={() => void signOut(firebaseAuth)}>Keluar</button></div> : <button className="dark-button" onClick={() => setAuthOpen(true)}>Masuk / daftar</button>}
      </nav>

      {user && <section className="dashboard" id="top">
        <header className="hero-copy"><div><p className="eyebrow">RITMA HARI INI · {profile.dayMode.toUpperCase()}</p><h1>Kalori kena pantau.</h1></div><div className="hero-side"><p>Rekod anda disimpan secara peribadi pada akaun e-mel ini.</p><div className="mode-switcher">{(["biasa", "puasa", "kerja_luar"] as Mode[]).map((mode) => <button key={mode} className={profile.dayMode === mode ? "active" : ""} onClick={() => void setDoc(doc(firebaseDb, "users", user.uid), { dayMode: mode }, { merge: true })}>{mode === "kerja_luar" ? "Kerja luar" : mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></div></header>

        <section className="pulse-card"><div className="pulse-heading"><div><p className="kicker">3 SASARAN HARI INI</p><h2>{score >= 90 ? "Ritma anda sangat baik hari ini." : "Teruskan sedikit demi sedikit."}</h2></div><div className="score"><strong>{score}</strong><span>/100</span></div></div><div className="metric-grid">{metrics.map((metric) => <article className="metric" key={metric.category}><div className={"ring " + metric.tone} style={{ "--progress": progress(total(todayEntries, metric.category), metric.valueTarget) + "%" } as CSSProperties}><span>{progress(total(todayEntries, metric.category), metric.valueTarget)}%</span></div><div className="metric-copy"><p>{metric.label}</p><strong>{metric.value}</strong><small> / {metric.target}</small></div><button className="metric-add" onClick={() => { setCategory(metric.category); setEntryOpen(true); }}>+</button></article>)}</div><div className="next-action"><span className="arrow">→</span><div><p>CADANGAN SETERUSNYA</p><strong>{water < profile.waterTargetMl ? "Tambah satu gelas air." : "Teruskan rutin anda hari ini."}</strong><small>Catat sedikit demi sedikit untuk lihat ritma sebenar.</small></div><button className="primary-button" onClick={() => setEntryOpen(true)}>Catat sekarang</button></div></section>

        <div className="lower-grid"><section className="rhythm-card"><div className="section-heading"><div><p className="kicker">REKOD HARI INI</p><h2>Makanan, air dan senaman anda.</h2></div><button className="text-button" onClick={() => setEntryOpen(true)}>+ Tambah</button></div>{todayEntries.length ? <ol className="entry-list">{[...todayEntries].sort((a,b) => a.entryTime.localeCompare(b.entryTime)).map((entry) => <li key={entry.id}><span className={"entry-dot " + entry.category}/><time>{entry.entryTime}</time><div><strong>{entry.label}</strong><small>{entry.amount} {entry.category === "meal" ? "kcal" : entry.category === "water" ? "ml" : "min"}</small></div><button onClick={() => void deleteDoc(doc(firebaseDb, "users", user.uid, "entries", entry.id))}>Padam</button></li>)}</ol> : <div className="empty-state"><strong>Belum ada rekod.</strong><p>Mula dengan satu catatan kecil untuk hari ini.</p></div>}</section><section className="week-card" id="profil"><p className="kicker">PROFIL & SASARAN</p><h2>Tetapan peribadi anda.</h2><form className="profile-form" onSubmit={saveProfile}><label>Nama paparan<input name="displayName" defaultValue={profile.displayName}/></label><label>Sasaran kalori<input name="calorieTarget" type="number" min="1" defaultValue={profile.calorieTarget}/></label><label>Sasaran air (ml)<input name="waterTargetMl" type="number" min="1" defaultValue={profile.waterTargetMl}/></label><label>Sasaran senaman (min)<input name="exerciseTargetMin" type="number" min="1" defaultValue={profile.exerciseTargetMin}/></label><input type="hidden" name="dayMode" value={profile.dayMode}/><button className="profile-submit">Simpan tetapan</button></form></section></div>
      </section>}

      {authOpen && !user && <div className="dialog-backdrop"><section className="profile-dialog"><button className="close-button" onClick={() => setAuthOpen(false)}>×</button><p className="kicker">RITMA SEBENAR</p><h2>{authMode === "signup" ? "Simpan rekod anda dengan akaun e-mel." : "Selamat kembali."}</h2><p className="dialog-intro">Rekod kalori, air dan senaman hanya boleh diakses oleh akaun anda.</p><form className="profile-form" onSubmit={submitAuth}><label>E-mel<input name="email" type="email" autoComplete="email" required/></label><label>Kata laluan<input name="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required/></label>{authError && <p className="helper">{authError}</p>}<button className="profile-submit" disabled={saving}>{saving ? "Sedang diproses…" : authMode === "signup" ? "Daftar & mula" : "Log masuk"}</button></form><button className="text-button" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>{authMode === "signup" ? "Sudah ada akaun? Log masuk" : "Belum ada akaun? Daftar"}</button></section></div>}

      {entryOpen && user && <div className="dialog-backdrop"><section className="profile-dialog"><button className="close-button" onClick={() => setEntryOpen(false)}>×</button><p className="kicker">CATAT HARI INI</p><h2>Tambah rekod</h2><div className="log-tabs">{(["meal", "water", "exercise"] as Category[]).map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item === "meal" ? "Makanan" : item === "water" ? "Air" : "Senaman"}</button>)}</div><form className="profile-form" onSubmit={addEntry}><label>{category === "meal" ? "Makanan" : category === "water" ? "Jenis minuman" : "Aktiviti"}<input name="label" required placeholder={category === "meal" ? "Contoh: Nasi campur" : category === "water" ? "Contoh: Air kosong" : "Contoh: Berjalan"}/></label><label>{category === "meal" ? "Kalori (kcal)" : category === "water" ? "Jumlah (ml)" : "Tempoh (minit)"}<input name="amount" type="number" min="1" required/></label><button className="profile-submit">Simpan rekod</button></form></section></div>}
      {toast && <div className="toast"><button onClick={() => setToast("")}>{toast}<span>×</span></button></div>}
    </main>
  );
}
