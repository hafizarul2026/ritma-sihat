"use client";

import { type FormEvent, useState } from "react";

type FormState = { name: string; email: string; whatsapp: string; goal: string; contactConsent: boolean; marketingWhatsapp: boolean; marketingEmail: boolean };
const initialForm: FormState = { name: "", email: "", whatsapp: "", goal: "", contactConsent: false, marketingWhatsapp: false, marketingEmail: false };

export function LeadDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!form.email.trim() && !form.whatsapp.trim()) return setError("Masukkan e-mel atau nombor WhatsApp.");
    if (!form.contactConsent) return setError("Tandakan persetujuan untuk menerima pelan anda.");
    setSaving(true);
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Maklumat tidak dapat disimpan.");
      setSubmitted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Maklumat tidak dapat disimpan."); }
    finally { setSaving(false); }
  }
  return <div className="dialog-backdrop"><section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-title">
    <header className="dialog-header"><div><p className="kicker">PERCUMA UNTUK ANDA</p><h2 id="lead-title">{submitted ? "Pelan Ritma 7 Hari" : "Dapatkan pelan Ritma 7 Hari."}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Tutup">×</button></header>
    {submitted ? <div className="dialog-intro"><p><strong>Hari 1:</strong> tambah satu gelas air selepas bangun.</p><p><strong>Hari 2:</strong> catat satu hidangan tanpa perlu sempurna.</p><p><strong>Hari 3:</strong> berjalan selama 10 minit.</p><p><strong>Hari 4–7:</strong> ulang satu tabiat yang paling mudah untuk anda.</p><button className="profile-submit" type="button" onClick={onClose}>Teruskan Ritma</button></div> : <><p className="dialog-intro">Masukkan satu cara untuk dihubungi. Rekod kalori, air dan senaman anda tidak dimasukkan ke dalam senarai prospek.</p><form className="profile-form" onSubmit={submit}>
      <div className="form-row"><label>Nama panggilan<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Aina" /></label><label>Matlamat utama<select value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })}><option value="">Pilih jika mahu</option><option value="lebih-bertenaga">Lebih bertenaga</option><option value="kurangkan-berat">Kurangkan berat</option><option value="mula-bersenam">Mula bersenam</option><option value="jaga-pemakanan">Jaga pemakanan</option></select></label></div>
      <div className="form-row"><label>E-mel<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="anda@email.com" /></label><label>WhatsApp<input inputMode="tel" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="0123456789" /></label></div>
      <div className="consent-box"><label className="check-row"><input type="checkbox" checked={form.contactConsent} onChange={(event) => setForm({ ...form, contactConsent: event.target.checked })} /><span><strong>Saya setuju Ritma menyimpan kontak ini untuk memberi pelan percuma.</strong><small>Pilih e-mel atau WhatsApp; satu sahaja pun memadai.</small></span></label><label className="check-row"><input type="checkbox" checked={form.marketingWhatsapp} onChange={(event) => setForm({ ...form, marketingWhatsapp: event.target.checked })} /><span><strong>Saya mahu terima tip dan tawaran melalui WhatsApp.</strong><small>Pilihan; anda boleh berhenti pada bila-bila masa.</small></span></label><label className="check-row"><input type="checkbox" checked={form.marketingEmail} onChange={(event) => setForm({ ...form, marketingEmail: event.target.checked })} /><span><strong>Saya mahu terima tip dan tawaran melalui e-mel.</strong><small>Pilihan; anda boleh berhenti pada bila-bila masa.</small></span></label></div>
      {error && <p className="helper" role="alert">{error}</p>}<button className="profile-submit" type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Buka pelan 7 hari"}</button></form></>}</section></div>;
}
