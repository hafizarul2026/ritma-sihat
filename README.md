# Ritma

Ritma ialah aplikasi ringkas untuk mencatat anggaran kalori, pengambilan air
dan senaman harian. Ia menyokong rutin hari biasa, puasa dan kerja luar.

## Apa yang boleh dibuat

- Cuba dashboard dalam mod demo tanpa log masuk.
- Log masuk dengan ChatGPT untuk menyimpan profil dan rekod sendiri.
- Tetapkan sasaran kalori, air dan senaman.
- Tambah atau padam rekod, lihat ringkasan tujuh hari dan kongsi recap ke WhatsApp.

## Privasi

Ritma menyimpan rekod yang dimasukkan oleh pengguna dan profil asas hanya
selepas persetujuan diberi. Ia bukan alat diagnosis atau nasihat perubatan;
semua nilai kalori ialah anggaran. Jangan masukkan maklumat kesihatan sensitif
yang tidak diperlukan untuk rekod harian anda.

## Pembangunan

Memerlukan Node.js 22.13 atau lebih baharu.

```bash
npm install
npm run dev
npm test
```

`npm test` membina aplikasi dan menyemak paparan demo serta perlindungan
idempotensi rekod. Data pengguna disimpan dalam D1 melalui binding `DB` yang
dinyatakan dalam `.openai/hosting.json`.
