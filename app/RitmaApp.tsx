"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { LogSheet, ProfileDialog } from "./components/RitmaDialogs";
import {
  type AuthUser,
  type Category,
  type DayMode,
  DEFAULT_PROFILE,
  type Entry,
  modes,
  type NewEntry,
  type Profile,
  type ProfileInput,
} from "./ritma-data";

function malaysiaDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function dateOffset(value: string, offset: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function currentTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function requestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "ritma-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function demoEntries(today: string): Entry[] {
  const rows = [
    [0, "meal", "Sarapan roti bakar", 420, "kcal", "08:10"],
    [0, "water", "Air kosong", 750, "ml", "09:30"],
    [0, "exercise", "Berjalan tengah hari", 18, "min", "12:45"],
    [0, "meal", "Nasi campur saya", 680, "kcal", "13:05"],
    [0, "water", "Air kosong", 750, "ml", "14:20"],
    [-1, "meal", "Nasi lemak + telur", 490, "kcal", "08:25"],
    [-1, "water", "Air kosong", 2100, "ml", "20:10"],
    [-1, "exercise", "Jalan santai", 32, "min", "18:20"],
    [-2, "meal", "Hidangan harian", 1650, "kcal", "20:00"],
    [-2, "water", "Air kosong", 1900, "ml", "20:30"],
    [-2, "exercise", "Kemas rumah", 25, "min", "17:10"],
    [-3, "meal", "Hidangan harian", 1810, "kcal", "20:00"],
    [-3, "water", "Air kosong", 2300, "ml", "21:00"],
    [-3, "exercise", "Berjalan", 35, "min", "18:00"],
  ] as const;

  return rows.map((row, index) => ({
    id: -(index + 1),
    userId: "demo",
    entryDate: dateOffset(today, row[0]),
    category: row[1],
    label: row[2],
    amount: row[3],
    unit: row[4],
    detail: "Data contoh",
    clientRequestId: "demo-" + index,
    entryTime: row[5],
    createdAt: new Date().toISOString(),
  }));
}

function sum(entries: Entry[], category: Category) {
  return entries
    .filter((entry) => entry.category === category)
    .reduce((total, entry) => total + entry.amount, 0);
}

function percent(value: number, target: number) {
  return target <= 0 ? 100 : Math.min(100, Math.round((value / target) * 100));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value + "T12:00:00+08:00"));
}

function initials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function RitmaApp({
  authUser,
  signInPath,
  signOutPath,
}: {
  authUser: AuthUser | null;
  signInPath: string;
  signOutPath: string;
}) {
  const today = useMemo(malaysiaDate, []);
  const [profile, setProfile] = useState<Profile | null | undefined>(
    authUser ? undefined : DEFAULT_PROFILE,
  );
  const [entries, setEntries] = useState<Entry[]>(() =>
    authUser ? [] : demoEntries(today),
  );
  const [loading, setLoading] = useState(Boolean(authUser));
  const [logCategory, setLogCategory] = useState<Category | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!authUser) return;
    let active = true;

    fetch("/api/dashboard?date=" + today)
      .then(async (response) => {
        const loaded = await response.json();
        if (!response.ok) throw new Error(loaded.error || "Gagal memuatkan rekod.");
        if (active) {
          setProfile(loaded.profile);
          setEntries(loaded.entries);
        }
      })
      .catch(() => {
        if (active) setToast("Rekod belum dapat dimuatkan. Cuba muat semula.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authUser, today]);

  const activeProfile = profile ?? DEFAULT_PROFILE;
  const todayEntries = entries.filter((entry) => entry.entryDate === today);
  const calories = sum(todayEntries, "meal");
  const water = sum(todayEntries, "water");
  const exercise = sum(todayEntries, "exercise");

  const metrics = [
    {
      category: "meal" as const,
      label: "Kalori",
      value: calories.toLocaleString("ms-MY"),
      target: activeProfile.calorieTarget.toLocaleString("ms-MY") + " kcal",
      progress: percent(calories, activeProfile.calorieTarget),
      tone: "coral",
      addLabel: "Catat makanan",
    },
    {
      category: "water" as const,
      label: "Air",
      value: (water / 1000).toFixed(1),
      target: (activeProfile.waterTargetMl / 1000).toFixed(1) + " L",
      progress: percent(water, activeProfile.waterTargetMl),
      tone: "aqua",
      addLabel: "Tambah air",
    },
    {
      category: "exercise" as const,
      label: "Senaman",
      value: exercise.toLocaleString("ms-MY"),
      target: activeProfile.exerciseTargetMin + " min",
      progress: percent(exercise, activeProfile.exerciseTargetMin),
      tone: "lime",
      addLabel: "Catat senaman",
    },
  ];

  const score = Math.round(
    metrics.reduce((total, metric) => total + metric.progress, 0) / metrics.length,
  );
  const wins = metrics.filter((metric) => metric.progress >= 90).length;

  const recommendation = useMemo(() => {
    const waterProgress = percent(water, activeProfile.waterTargetMl);
    const exerciseProgress = percent(exercise, activeProfile.exerciseTargetMin);

    if (waterProgress < 70) {
      if (activeProfile.dayMode === "puasa") {
        return {
          category: "water" as const,
          title: "Cuba minum 350 ml air selepas berbuka.",
          reason: "Jumlah air hari ini masih di bawah sasaran.",
        };
      }
      if (activeProfile.dayMode === "kerja_luar") {
        return {
          category: "water" as const,
          title: "Minum 350 ml air bila ada masa rehat.",
          reason: "Semasa kerja luar, cuba minum sedikit demi sedikit.",
        };
      }
      return {
        category: "water" as const,
        title: "Cuba minum 350 ml air sekarang.",
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
    if (!todayEntries.some((entry) => entry.category === "meal")) {
      return {
        category: "meal" as const,
        title: "Masukkan anggaran kalori makanan anda.",
        reason: "Tak perlu terlalu tepat; anggaran pun memadai.",
      };
    }
    return {
      category: "water" as const,
      title: "Teruskan rutin anda hari ini.",
      reason: "Teruskan ikut kemampuan anda.",
    };
  }, [activeProfile, exercise, todayEntries, water]);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => dateOffset(today, index - 6)).map(
        (date) => {
          const dayEntries = entries.filter((entry) => entry.entryDate === date);
          const dayScore = Math.round(
            (percent(sum(dayEntries, "meal"), activeProfile.calorieTarget) +
              percent(sum(dayEntries, "water"), activeProfile.waterTargetMl) +
              percent(sum(dayEntries, "exercise"), activeProfile.exerciseTargetMin)) /
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
        },
      ),
    [activeProfile, entries, today],
  );

  async function saveProfile(input: ProfileInput) {
    setSavingProfile(true);
    try {
      if (!authUser) {
        setProfile({ ...DEFAULT_PROFILE, ...input });
        setToast("Tetapan demo dah dikemas kini. Log masuk untuk simpan.");
        setProfileOpen(false);
        return;
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Profil tidak dapat disimpan.");
      setProfile(saved.profile);
      setProfileOpen(false);
      setToast("Tetapan anda dah disimpan.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Profil tidak dapat disimpan.");
      throw error;
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeMode(mode: DayMode) {
    await saveProfile({
      whatsapp: activeProfile.whatsapp,
      displayName: activeProfile.displayName,
      dayMode: mode,
      calorieTarget: activeProfile.calorieTarget,
      waterTargetMl: activeProfile.waterTargetMl,
      exerciseTargetMin: activeProfile.exerciseTargetMin,
      contactConsent: activeProfile.contactConsent || !authUser,
      marketingWhatsapp: activeProfile.marketingWhatsapp,
      marketingEmail: activeProfile.marketingEmail,
    });
  }

  async function addEntry(input: NewEntry) {
    if (savingEntry) return;
    setSavingEntry(true);
    const clientRequestId = requestId();
    const draft: Entry = {
      id: -Date.now(),
      userId: authUser?.userId ?? "demo",
      entryDate: today,
      category: input.category,
      label: input.label,
      amount: input.amount,
      unit: input.category === "meal" ? "kcal" : input.category === "water" ? "ml" : "min",
      detail: input.detail,
      clientRequestId,
      entryTime: currentTime(),
      createdAt: new Date().toISOString(),
    };

    try {
      if (!authUser) {
        setEntries((current) => [...current, draft]);
        setToast("Ditambah dalam mod demo. Log masuk untuk simpan di peranti lain.");
      } else {
        const response = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const saved = await response.json();
        if (!response.ok) throw new Error(saved.error || "Catatan tidak dapat disimpan.");
        setEntries((current) => [...current, saved.entry]);
        setToast("Rekod disimpan.");
      }
      setLogCategory(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Catatan tidak dapat disimpan.");
    } finally {
      setSavingEntry(false);
    }
  }

  async function removeEntry(entry: Entry) {
    if (!authUser || entry.id < 0) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setToast("Rekod demo dipadam.");
      return;
    }

    const response = await fetch("/api/entries?id=" + entry.id, { method: "DELETE" });
    if (response.ok) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setToast("Rekod dipadam.");
    } else {
      setToast("Rekod tak dapat dipadam. Cuba lagi.");
    }
  }

  function openLog(category: Category) {
    if (authUser && profile === null) {
      setProfileOpen(true);
      setToast("Isi profil dulu sebelum simpan catatan.");
      return;
    }
    setLogCategory(category);
  }

  function recapText() {
    return (
      "Rekod hari ini: " + calories + "/" + activeProfile.calorieTarget +
      " kcal, " + (water / 1000).toFixed(1) + "/" +
      (activeProfile.waterTargetMl / 1000).toFixed(1) + " L air, " +
      exercise + "/" + activeProfile.exerciseTargetMin + " min senaman. " +
      wins + "/3 sasaran tercapai."
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

  const showProfile = profileOpen || (Boolean(authUser) && profile === null && !loading);
  const selectedMode = modes.find((mode) => mode.value === activeProfile.dayMode)!;

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Navigasi utama">
        <a className="brand" href="#top" aria-label="Ritma — laman utama">ritma<span>.</span></a>
        <div className="nav-actions">
          <p className="date-label">{formatDate(today)}</p>
          {authUser ? (
            <div className="account-menu">
              <button className="avatar-button" type="button" onClick={() => setProfileOpen(true)} aria-label="Buka tetapan profil">
                {initials(activeProfile.displayName || authUser.displayName || authUser.email)}
              </button>
              <a className="quiet-link" href={signOutPath}>Keluar</a>
            </div>
          ) : (
            <a className="dark-button" href={signInPath}>Log masuk</a>
          )}
        </div>
      </nav>

      {!authUser && (
        <aside className="demo-banner" aria-label="Makluman mod demo">
          <span>MOD DEMO</span>
          <p>Cuba semua fungsi. Log masuk untuk simpan rekod serta profil WhatsApp/e-mel anda.</p>
          <a href={signInPath}>Log masuk & simpan</a>
        </aside>
      )}

      <section className="dashboard" id="top" aria-busy={loading}>
        <header className="hero-copy">
          <div>
            <p className="eyebrow">HARI INI · {selectedMode.label.toUpperCase()}</p>
            <h1>{loading ? "Sedang memuatkan rekod…" : "Kalori kena pantau."}</h1>
          </div>
          <div className="hero-side">
            <p>Catat kalori, air dan senaman, sama ada hari biasa, puasa atau kerja luar.</p>
            <div className="mode-switcher" aria-label="Pilih rutin">
              {modes.map((mode) => (
                <button type="button" key={mode.value} className={mode.value === activeProfile.dayMode ? "active" : ""} aria-pressed={mode.value === activeProfile.dayMode} title={mode.hint} disabled={savingProfile} onClick={() => changeMode(mode.value)}>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="pulse-card" aria-labelledby="pulse-title">
          <div className="pulse-heading">
            <div><p className="kicker">3 SASARAN HARI INI</p><h2 id="pulse-title">{wins === 3 ? "Semua sasaran hari ini tercapai." : wins + "/3 sasaran dicapai hari ini."}</h2></div>
            <div className="score" aria-label={"Skor hari ini " + score + " daripada 100"}><strong>{score}</strong><span>/100</span></div>
          </div>

          <div className="metric-grid">
            {metrics.map((metric) => (
              <article className="metric" key={metric.category}>
                <div className={"ring " + metric.tone} style={{ "--progress": metric.progress + "%" } as CSSProperties} aria-hidden="true"><span>{metric.progress}%</span></div>
                <div className="metric-copy"><p>{metric.label}</p><strong>{metric.value}</strong><small> / {metric.target}</small></div>
                <button type="button" className="metric-add" onClick={() => openLog(metric.category)} aria-label={metric.addLabel}>+</button>
              </article>
            ))}
          </div>

          <div className="next-action">
            <span className="arrow" aria-hidden="true">→</span>
            <div><p>CADANGAN SETERUSNYA</p><strong>{recommendation.title}</strong><small>{recommendation.reason}</small></div>
            <button className="primary-button" type="button" onClick={() => openLog(recommendation.category)}>Catat sekarang</button>
          </div>
        </section>

        <div className="lower-grid">
          <section className="rhythm-card" aria-labelledby="timeline-title">
            <div className="section-heading">
              <div><p className="kicker">REKOD HARI INI</p><h2 id="timeline-title">Makanan, air dan senaman yang anda catat.</h2></div>
              <button type="button" className="text-button" onClick={() => openLog("meal")}>+ Tambah</button>
            </div>
            {todayEntries.length ? (
              <ol className="entry-list">
                {[...todayEntries].sort((a, b) => a.entryTime.localeCompare(b.entryTime)).map((entry) => (
                  <li key={entry.clientRequestId}>
                    <span className={"entry-dot " + entry.category} aria-hidden="true" />
                    <time>{entry.entryTime}</time>
                    <div><strong>{entry.label}</strong><small>{entry.amount.toLocaleString("ms-MY")} {entry.unit}{entry.detail ? " · " + entry.detail : ""}</small></div>
                    <button type="button" onClick={() => removeEntry(entry)} aria-label={"Padam " + entry.label}>Padam</button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state"><strong>Belum ada catatan.</strong><p>Tambah rekod pertama anda—makanan, air atau senaman.</p></div>
            )}
          </section>

          <section className="week-card" aria-labelledby="week-title">
            <div><p className="kicker">7 HARI TERKINI</p><h2 id="week-title">Ringkasan 7 hari anda.</h2></div>
            <div className="week-bars" aria-label="Ringkasan skor tujuh hari">
              {week.map((day) => (
                <div className="week-day" key={day.date}>
                  <div className="bar-track"><span style={{ height: Math.max(6, day.score) + "%" }} /></div>
                  <strong>{day.label}</strong><small>{day.score}%</small>
                </div>
              ))}
            </div>
            <div className="share-actions">
              <button type="button" onClick={shareWhatsapp}>Kongsi di WhatsApp</button>
              <button type="button" onClick={copyRecap}>Salin ringkasan</button>
            </div>
          </section>
        </div>

        <footer className="app-footer">
          <p><strong>Semua angka ialah anggaran.</strong> Nilai hidangan berubah mengikut saiz dan resipi. Jika anda hamil, ada sekatan cecair atau masalah kesihatan, semak sasaran dengan profesional kesihatan.</p>
          <button type="button" onClick={() => setProfileOpen(true)}>Privasi & tetapan</button>
        </footer>
      </section>

      {logCategory && <LogSheet category={logCategory} saving={savingEntry} onClose={() => setLogCategory(null)} onAdd={addEntry} />}
      {showProfile && (
        <ProfileDialog
          profile={profile ?? DEFAULT_PROFILE}
          authUser={authUser}
          saving={savingProfile}
          mustComplete={Boolean(authUser) && profile === null}
          onClose={() => {
            if (profile !== null || !authUser) setProfileOpen(false);
          }}
          onSave={saveProfile}
        />
      )}
      <div className="toast" role="status" aria-live="polite">
        {toast && <button type="button" onClick={() => setToast("")}>{toast}<span aria-hidden="true">×</span></button>}
      </div>
    </main>
  );
}