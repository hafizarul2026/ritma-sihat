"use client";

import { type FormEvent, useState } from "react";
import {
  type AuthUser,
  type Category,
  type NewEntry,
  type Profile,
  type ProfileInput,
  modes,
} from "../ritma-data";

export function LogSheet({
  category,
  saving,
  onClose,
  onAdd,
}: {
  category: Category;
  saving: boolean;
  onClose: () => void;
  onAdd: (entry: NewEntry) => Promise<void>;
}) {
  const [active, setActive] = useState<Category>(category);
  const [selectedParts, setSelectedParts] = useState(["rice1", "chicken", "veg"]);
  const [manualLabel, setManualLabel] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  const mealParts = [
    { id: "rice0", label: "Tanpa nasi", low: 0, high: 0, group: "rice" },
    { id: "rice1", label: "Nasi 1 senduk", low: 120, high: 150, group: "rice" },
    { id: "rice2", label: "Nasi 2 senduk", low: 240, high: 300, group: "rice" },
    { id: "chicken", label: "Ayam masak merah", low: 230, high: 300, group: "protein" },
    { id: "fish", label: "Ikan goreng", low: 190, high: 260, group: "protein" },
    { id: "egg", label: "Telur", low: 70, high: 100, group: "protein" },
    { id: "veg", label: "Sayur", low: 50, high: 90, group: "extra" },
    { id: "gravy", label: "Kuah sedikit", low: 30, high: 70, group: "extra" },
    { id: "sambal", label: "Sambal", low: 25, high: 60, group: "extra" },
  ];

  const chosen = mealParts.filter((part) => selectedParts.includes(part.id));
  const mealLow = chosen.reduce((total, part) => total + part.low, 0);
  const mealHigh = chosen.reduce((total, part) => total + part.high, 0);

  function togglePart(id: string, group: string) {
    setSelectedParts((current) => {
      const sameGroup = mealParts
        .filter((part) => part.group === group)
        .map((part) => part.id);
      if (group === "rice" || group === "protein") {
        return [...current.filter((part) => !sameGroup.includes(part)), id];
      }
      return current.includes(id)
        ? current.filter((part) => part !== id)
        : [...current, id];
    });
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const amount = Number(manualAmount);
    if (!manualLabel.trim() || !Number.isFinite(amount) || amount <= 0) return;
    void onAdd({
      category: active,
      label: manualLabel.trim(),
      amount: Math.round(amount),
      detail: "Nilai dimasukkan sendiri",
    });
  }

  const quickMeals = [
    { label: "Nasi lemak + telur", amount: 490, detail: "Anggaran 440–540 kcal" },
    { label: "Roti canai + dhal", amount: 360, detail: "Anggaran 320–400 kcal" },
    { label: "Bihun goreng", amount: 430, detail: "Anggaran 380–480 kcal" },
  ];

  return (
    <div className="dialog-backdrop">
      <section
        className="log-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="dialog-header">
          <div>
            <p className="kicker">TAMBAH REKOD</p>
            <h2 id="log-title">Apa yang nak dicatat?</h2>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Tutup"
          >
            ×
          </button>
        </header>

        <div className="log-tabs" role="tablist" aria-label="Jenis catatan">
          {([
            ["meal", "Makanan"],
            ["water", "Air"],
            ["exercise", "Senaman"],
          ] as Array<[Category, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active === value}
              className={active === value ? "active" : ""}
              onClick={() => setActive(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {active === "meal" && (
          <div className="log-content">
            <div>
              <p className="field-label">Pilihan cepat</p>
              <div className="quick-grid">
                {quickMeals.map((meal) => (
                  <button
                    key={meal.label}
                    type="button"
                    disabled={saving}
                    onClick={() => void onAdd({ category: "meal", ...meal })}
                  >
                    <strong>{meal.label}</strong>
                    <span>{meal.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="meal-builder">
              <div className="builder-heading">
                <div>
                  <p className="field-label">Kira nasi campur</p>
                  <small>Pilih senduk, lauk dan tambahan.</small>
                </div>
                <strong>{mealLow}–{mealHigh} kcal</strong>
              </div>
              <div className="part-chips">
                {mealParts.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    aria-pressed={selectedParts.includes(part.id)}
                    onClick={() => togglePart(part.id, part.group)}
                  >
                    {part.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="save-meal"
                disabled={saving || !chosen.length}
                onClick={() =>
                  void onAdd({
                    category: "meal",
                    label: "Nasi campur saya",
                    amount: Math.round((mealLow + mealHigh) / 2),
                    detail:
                      chosen.map((part) => part.label).join(", ") +
                      " · anggaran " +
                      mealLow +
                      "–" +
                      mealHigh +
                      " kcal",
                  })
                }
              >
                {saving ? "Menyimpan…" : "Tambah hidangan"}
              </button>
            </div>
          </div>
        )}

        {active === "water" && (
          <div className="log-content">
            <p className="field-label">Berapa banyak?</p>
            <div className="amount-grid">
              {[250, 350, 500, 750].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void onAdd({
                      category: "water",
                      label: "Air kosong",
                      amount,
                      detail: "",
                    })
                  }
                >
                  <strong>+{amount}</strong>
                  <span>ml</span>
                </button>
              ))}
            </div>
            <p className="helper">
              Jumlah air ini cuma sasaran harian. Jangan paksa minum jika doktor mengehadkan pengambilan air anda.
            </p>
          </div>
        )}

        {active === "exercise" && (
          <div className="log-content">
            <p className="field-label">Aktiviti harian pun dikira.</p>
            <div className="quick-grid exercise-grid">
              {[
                ["Jalan santai", 10],
                ["Kemas rumah", 20],
                ["Naik tangga", 10],
                ["Senaman pilihan", 30],
              ].map(([label, amount]) => (
                <button
                  key={String(label)}
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void onAdd({
                      category: "exercise",
                      label: String(label),
                      amount: Number(amount),
                      detail: "",
                    })
                  }
                >
                  <strong>{String(label)}</strong>
                  <span>{Number(amount)} min</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="manual-form" onSubmit={submitManual}>
          <p className="field-label">Atau catat sendiri</p>
          <label>
            Nama
            <input
              value={manualLabel}
              onChange={(event) => setManualLabel(event.target.value)}
              placeholder={
                active === "meal"
                  ? "Contoh: Mee kari"
                  : active === "water"
                    ? "Contoh: Air kosong"
                    : "Contoh: Berbasikal"
              }
            />
          </label>
          <label>
            {active === "meal"
              ? "Kalori (kcal)"
              : active === "water"
                ? "Jumlah air (ml)"
                : "Tempoh (minit)"}
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={manualAmount}
              onChange={(event) => setManualAmount(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={saving || !manualLabel || !manualAmount}
          >
            {saving ? "Menyimpan…" : "Simpan rekod"}
          </button>
        </form>
      </section>
    </div>
  );
}

export function ProfileDialog({
  profile,
  authUser,
  saving,
  mustComplete,
  onClose,
  onSave,
}: {
  profile: Profile;
  authUser: AuthUser | null;
  saving: boolean;
  mustComplete: boolean;
  onClose: () => void;
  onSave: (profile: ProfileInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ProfileInput>({
    whatsapp: profile.whatsapp,
    displayName: profile.displayName,
    dayMode: profile.dayMode,
    calorieTarget: profile.calorieTarget,
    waterTargetMl: profile.waterTargetMl,
    exerciseTargetMin: profile.exerciseTargetMin,
    contactConsent: profile.contactConsent,
    marketingWhatsapp: profile.marketingWhatsapp,
    marketingEmail: profile.marketingEmail,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await onSave(form);
    } catch {
      // The parent announces the API error in the live status region.
    }
  }

  return (
    <div className="dialog-backdrop">
      <section
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        <header className="dialog-header">
          <div>
            <p className="kicker">
              {mustComplete ? "SATU LANGKAH LAGI" : "PROFIL & PRIVASI"}
            </p>
            <h2 id="profile-title">
              {mustComplete ? "Lengkapkan profil anda." : "Tetapan anda"}
            </h2>
          </div>
          {!mustComplete && (
            <button
              type="button"
              className="close-button"
              onClick={onClose}
              aria-label="Tutup"
            >
              ×
            </button>
          )}
        </header>
        <p className="dialog-intro">
          Kami hanya simpan maklumat akaun, sasaran dan rekod harian anda. Kami tidak meminta dokumen atau gambar IC.
        </p>

        <form className="profile-form" onSubmit={submit}>
          <div className="form-row">
            <label>
              Nama panggilan
              <input
                value={form.displayName}
                onChange={(event) =>
                  setForm({ ...form, displayName: event.target.value })
                }
                placeholder="Contoh: Hafiz"
              />
            </label>
            <label>
              E-mel akaun
              <input
                value={authUser?.email ?? "demo@ritma.local"}
                readOnly
                aria-describedby="email-note"
              />
              <small id="email-note">
                Daripada akaun log masuk; tidak boleh diubah di sini.
              </small>
            </label>
          </div>

          <label>
            Nombor WhatsApp
            <input
              required
              inputMode="tel"
              value={form.whatsapp}
              onChange={(event) =>
                setForm({ ...form, whatsapp: event.target.value })
              }
              placeholder="Contoh: 0123456789"
            />
          </label>

          <fieldset>
            <legend>Pilihan hari</legend>
            <div className="mode-options">
              {modes.map((mode) => (
                <label
                  key={mode.value}
                  className={form.dayMode === mode.value ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="dayMode"
                    value={mode.value}
                    checked={form.dayMode === mode.value}
                    onChange={() =>
                      setForm({ ...form, dayMode: mode.value })
                    }
                  />
                  <strong>{mode.label}</strong>
                  <small>{mode.hint}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Sasaran harian</legend>
            <div className="target-grid">
              <label>
                Kalori sehari
                <input
                  type="number"
                  min="800"
                  max="6000"
                  value={form.calorieTarget}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      calorieTarget: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Air (ml)
                <input
                  type="number"
                  min="500"
                  max="8000"
                  step="100"
                  value={form.waterTargetMl}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      waterTargetMl: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Senaman (minit)
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={form.exerciseTargetMin}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      exerciseTargetMin: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <p className="helper">
              Anda tentukan sendiri sasaran ini. Kami tidak menyimpan berat, umur atau rekod perubatan anda.
            </p>
          </fieldset>

          <div className="consent-box">
            <label className="check-row" aria-label="Setuju menyimpan maklumat akaun">
              <input
                type="checkbox"
                required
                checked={form.contactConsent}
                onChange={(event) =>
                  setForm({ ...form, contactConsent: event.target.checked })
                }
              />
              <span>
                <strong>Saya setuju maklumat akaun ini disimpan</strong>
                <small>
                  Supaya rekod anda boleh dibuka semula selepas log masuk.
                </small>
              </span>
            </label>
            <label className="check-row" aria-label="Terima tip melalui WhatsApp">
              <input
                type="checkbox"
                checked={form.marketingWhatsapp}
                onChange={(event) =>
                  setForm({
                    ...form,
                    marketingWhatsapp: event.target.checked,
                  })
                }
              />
              <span>
                <strong>Saya mahu terima tip dan kemas kini melalui WhatsApp</strong>
                <small>Pilihan. Anda boleh berhenti bila-bila masa dalam tetapan.</small>
              </span>
            </label>
            <label className="check-row" aria-label="Terima tip melalui e-mel">
              <input
                type="checkbox"
                checked={form.marketingEmail}
                onChange={(event) =>
                  setForm({ ...form, marketingEmail: event.target.checked })
                }
              />
              <span>
                <strong>Saya mahu terima tip dan kemas kini melalui e-mel</strong>
                <small>
                  Pilihan. Anda boleh berhenti bila-bila masa dalam tetapan.
                </small>
              </span>
            </label>
          </div>

          <button
            className="profile-submit"
            type="submit"
            disabled={saving || !form.whatsapp || !form.contactConsent}
          >
            {saving
              ? "Menyimpan…"
              : mustComplete
                ? "Simpan dan teruskan"
                : "Simpan tetapan"}
          </button>
        </form>
      </section>
    </div>
  );
}