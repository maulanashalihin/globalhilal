# PLAN — Global Hijri Month API (Rukyat-Based)

> Status: in progress (Fase 1–3 selesai + redesign publik; tersisa Fase 4–5).
> Bahasa web + API: **English**. Dokumen ini boleh Bahasa Indonesia (untuk tim/editor).
> Brand: **GlobalHilal** — domain: **globalhilal.org** (`APP_URL=https://globalhilal.org`).
> Stack & konvensi mengikuti `AGENTS.md` — baca itu dulu sebelum coding.

## 0. Ringkasan satu paragraf

Bangun **public API + web ringan** yang menjawab satu pertanyaan untuk seluruh kaum muslimin: **"hari ini tanggal berapa Hijriyah menurut rukyat hilal global?"**, plus **arsip history per bulan** (kapan bulan dimulai, kenapa ditetapkan demikian, hilal terlihat di mana, apa source referensinya). Metode: **rukyat global (ittihad al-mathali')** — jika hilal terlihat sah di **1 tempat mana pun di dunia**, maka itu awal bulan untuk semua. Jika tidak terlihat → istikmal 30 hari. Setiap penetapan wajib punya **alasan + referensi + lokasi sighting** yang bisa diverifikasi publik.

---

## 1. Prinsip syar'i & metodologi (LOCKED — ditulis eksplisit di `/methodology`)

Keputusan di bawah sudah dikunci pemilik dan menentukan seluruh logika data:

1. **Syarat sah = kesaksian (syahadah), sesuai hadits Rasulullah.** Bulan baru ditetapkan bila ada kesaksian rukyat yang kredibel. Tanpa kesaksian sah → istikmal 30 hari. Teks hadits + penjelasan ditampilkan di `/methodology`.
2. **Global sighting, satu mathla'.** 1 kesaksian sah di mana pun di dunia → awal bulan untuk semua. **Tidak ada kewajiban mengikuti Arab Saudi.** Saudi hanya satu sumber di antara sumber-sumber lain, bobotnya sama.
3. **Rukyat saja, tanpa masa depan.** Tidak ada kalender prediksi/estimasi untuk bulan-bulan ke depan. Satu-satunya "hitungan maju" adalah **tanggal monitoring berikutnya** (malam ke-29 bulan berjalan) — lihat `next_observation_date` di API.
4. **Tanpa batas hari (no day boundary).** Keterlambatan laporan tidak membatalkan. Contoh: Indonesia sudah pagi, lalu masuk kesaksian sah dari belahan dunia lain yang malamnya lebih lambat → hari Gregorian itu sah sebagai tanggal 1 (revisi retroaktif di hari yang sama). Konsekuensi teknis: respons API pada jendela rukyat boleh berubah intraday + cache TTL sangat pendek (lihat §9).
5. **Status penetapan berlapis:** `provisional` (1 kesaksian awal) → `confirmed` (kesaksian terverifikasi + referensi putusan) → `corrected` (koreksi dengan changelog, data lama tidak dihapus).
6. **Transparansi penuh.** Setiap bulan menampilkan: ringkasan keputusan (EN), daftar sighting (negara/kota/metode/saksi), daftar referensi putusan (URL + publisher + kutipan), dan siapa yang menetapkan + kapan.

Contoh teks methodology (EN) disiapkan editor, bukan developer.

---

## 2. Untuk siapa & use cases

| Pengguna | Kebutuhan | Fitur yang menjawab |
|---|---|---|
| Muslim umum | "Hari ini tanggal berapa Hijriyah?" | `/`, `/today`, `GET /api/v1/today` |
| Developer masjid / aplikasi | Tanggal Hijriyah di website/jadwal sholat | Public JSON API tanpa auth, CORS terbuka, widget embed |
| Peneliti / jurnalis | "Kenapa Ramadhan 1447 jatuh tanggal X?" | `/hijri/1447-9` + references + changelog |
| Editor internal | Input penetapan tiap bulan | `/admin/hijri` (auth + role) |

**Definisi "berguna untuk seluruh dunia":** gratis, tanpa login, English, timezone-aware (tz hanya untuk menentukan tanggal Gregorian peminta; penanggalan Hijriyah-nya global dan sama untuk semua), cepat (CDN-cached), bisa di-embed, ada arsip, ada sumber.

---

## 3. Scope

### MVP (V1) — harus ada sebelum launch

- [x] `GET /api/v1/today`, `GET /api/v1/convert`, `GET /api/v1/months`, `GET /api/v1/months/current`, `GET /api/v1/months/:year/:month`
- [x] Web publik: `/` (tanggal hari ini), `/today`, `/calendar`, `/hijri/:key`, `/methodology`, `/sources`, `/docs` (API docs)
- [ ] Admin CRUD penetapan + sighting + references (`/admin/hijri`)
- [x] Seed 1448H berjalan dari referensi asli (scope dipangkas atas keputusan pemilik — tanpa backfill tahun lama; dev DB: 1448-01–1448-04 + 9 sighting + 10 referensi)
- [x] CORS + CDN cache + SEO + tests hijau (101 tests, typecheck 0 errors)

### Non-MVP (ditunda eksplisit)

- Kalender prediksi masa depan / estimasi bulan ke depan (DITOLAK secara prinsip — V1 maupun V2 tidak membuat forecast; hanya `next_observation_date`).
- Perhitungan Maghrib per-kota, peta visibilitas hilal, notifikasi (email/Telegram), API key/kuota, kalender ICS feed, widget JS versi 2. Catat di roadmap, jangan dikerjakan di V1.
- Multi-bahasa (AR/EN) sekarang **aktif** dengan rencana terpisah: [`PLAN-I18N.md`](PLAN-I18N.md) (deteksi `CF-IPCountry` + cookie, API tidak berubah).

---

## 4. Arsitektur (wajib ikut `AGENTS.md`)

```
src/server/routes/hijri-api.routes.ts  # /api/v1/* (JSON saja, CORS, cache publik)
src/server/routes/hijri.routes.ts       # /* pages: /, /today, /calendar, /hijri/:key,
                                        #   /methodology, /sources, /docs
src/server/hijri.ts                     # logika murni: gregorian↔hijri lookup, validasi key,
                                        #   status resolution (tanpa Hono) — reusable + testable
src/server/db.ts                        # TAMBAH prepared statements hijri di sini saja (jangan file db baru)
migrations/0006_hijri_months.sql        # tabel hijri_months
migrations/0007_sighting_reports.sql    # tabel sighting_reports
migrations/0008_month_references.sql    # tabel month_references (+ changelog bila perlu)
src/shared/types.ts                     # tambah tipe Hijri* (tanpa runtime import)
src/client/pages.ts                     # daftarkan page Svelte baru (import eksplisit)
src/client/pages/Hijri*.svelte          # Home/Today/Calendar/MonthDetail/Methodology/Sources/Docs/AdminHijri
tests/hijri.test.ts                     # E2E via app.request(), DB in-memory
```

Aturan keras:

1. **File = namespace URL.** Semua `/api/v1/hijri*` di `hijri-api.routes.ts`, semua page di `hijri.routes.ts`. Jangan taruh page fitur di `pages.routes.ts` (itu app-shell saja).
2. **`src/server/` flat kecuali `routes/`.** Jangan bikin folder `hijri/`. Logika reuse → satu modul flat (`hijri.ts`).
3. **Semua SQL di `db.ts`** sebagai prepared statements. Schema = file migrasi bernomor baru, tidak pernah edit migrasi lama.
4. **Env hanya di `config.ts`.** V1 idealnya **tanpa env baru**. Kalau butuh (mis. `HIJRI_CACHE_TTL`), tambah di `config.ts` + tabel env di README.
5. **Validasi TypeBox** di route level (`validation.ts`), error 422 JSON untuk API (`{ errors }`, bukan Inertia page).
6. **TS strict + `import type`.** Tidak ada `any` longgar.
7. **UI ikut design system.** Baca `.llm-wiki/wiki/concepts/ui-design-principles.md` + `ui-anti-patterns.md` sebelum sentuh Svelte. Utility Tailwind + token (`bg-surface`, `text-muted`, …), form via `useForm` + `<form>` dari `@inertiajs/svelte`.

---

## 5. Model data

### 5.1 `hijri_months` (satu row = satu bulan Hijriyah)

```sql
CREATE TABLE IF NOT EXISTS hijri_months (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hijri_year          INTEGER NOT NULL,            -- e.g. 1447
  hijri_month         INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  month_key           TEXT NOT NULL UNIQUE,        -- '1447-09' (zero-padded, canonical)
  month_name_en       TEXT NOT NULL,               -- 'Ramadan'
  month_name_ar       TEXT NOT NULL,               -- 'رمضان'
  start_gregorian     TEXT NOT NULL,               -- 'YYYY-MM-DD' (UTC date of first valid testimony;
                                                 -- late testimony from another timezone still maps to
                                                 -- this same date = retroactive day-1, no day boundary)
  end_gregorian       TEXT,                        -- NULL sampai bulan berikutnya ditetapkan
  length_days         INTEGER CHECK (length_days IN (29, 30)),
  -- next_observation_date TIDAK disimpan: dihitung = start_gregorian + 28 hari
  -- (malam ke-29 = evening watch). Tidak ada forecast bulan depan.
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','provisional','confirmed','corrected')),
  decision_summary_en TEXT NOT NULL,               -- 2-5 kalimat: kenapa ditetapkan demikian
  created_by          INTEGER REFERENCES users(id),
  published_at        TEXT,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hijri_months_key ON hijri_months(month_key);
CREATE INDEX IF NOT EXISTS idx_hijri_months_start ON hijri_months(start_gregorian);
```

Nama bulan (EN canonical, konsisten di seluruh web/API):

`1 Muharram, 2 Safar, 3 Rabi' al-Awwal, 4 Rabi' al-Thani, 5 Jumada al-Ula, 6 Jumada al-Akhirah, 7 Rajab, 8 Sha'ban, 9 Ramadan, 10 Shawwal, 11 Dhu al-Qa'dah, 12 Dhu al-Hijjah`

### 5.2 `sighting_reports` (bukti rukyat per bulan)

```sql
CREATE TABLE IF NOT EXISTS sighting_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id      INTEGER NOT NULL REFERENCES hijri_months(id) ON DELETE CASCADE,
  country       TEXT NOT NULL,          -- ISO-ish free text, e.g. 'Saudi Arabia'
  city          TEXT,                   -- e.g. 'Tumair'
  lat           REAL,
  lon           REAL,
  sighted_on    TEXT NOT NULL,          -- 'YYYY-MM-DD' (evening observation date, local)
  result        TEXT NOT NULL CHECK (result IN ('seen','not_seen','cloudy')),
  method        TEXT NOT NULL CHECK (method IN ('naked_eye','telescope','both','unknown')),
  witness_org   TEXT,                   -- e.g. 'Tumair observatory committee' / nama saksi atau lembaga
  verified      INTEGER NOT NULL DEFAULT 0,  -- 0/1: kesaksian sudah dicek kredibilitasnya (basis syahadah)
  note_en       TEXT,                   -- wajib diisi: siapa bersaksi, kepada siapa, bagaimana verifikasinya
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sighting_month ON sighting_reports(month_id);
```

Minimal 1 row `result='seen', verified=1` untuk status `confirmed` (ditegakkan di `hijri.ts`, bukan cuma di UI).

### 5.3 `month_references` (source per penetapan)

```sql
CREATE TABLE IF NOT EXISTS month_references (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id      INTEGER NOT NULL REFERENCES hijri_months(id) ON DELETE CASCADE,
  title_en      TEXT NOT NULL,
  publisher     TEXT NOT NULL,          -- e.g. 'Saudi Press Agency'
  url           TEXT NOT NULL,
  published_at  TEXT,
  quote_en      TEXT,                   -- kutipan pendek yang mendukung keputusan
  kind          TEXT NOT NULL DEFAULT 'official'
                CHECK (kind IN ('official','news','org','other')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ref_month ON month_references(month_id);
```

Koreksi tidak menghapus row lama: update `hijri_months` → status `corrected` + tulis penjelasan di `decision_summary_en` (append dengan tanggal koreksi). V2 boleh tambah tabel `month_changelog`.

---

## 6. Spesifikasi Public API v1 (semua response English, JSON)

Base: `/api/v1`. **Tanpa auth. CORS `*` untuk GET. `Cache-Control: private, no-store` JANGAN dipakai di sini** — sebaliknya pakai cache publik (lihat §9).

### 6.1 `GET /api/v1/today`

Menjawab "hari ini tanggal berapa menurut rukyat bulan ini".

Query: `tz` (IANA, default `UTC`), `date` (opsional `YYYY-MM-DD`, default hari ini di `tz` — untuk testing/embed). `tz` hanya menentukan tanggal Gregorian peminta; hasil Hijriyah global, sama untuk semua zona.

Response `200`:

```json
{
  "data": {
    "gregorian": { "date": "2026-09-20", "timezone": "Asia/Jakarta" },
    "hijri": {
      "year": 1448, "month": 3, "month_key": "1448-03",
      "month_en": "Rabi' al-Awwal", "month_ar": "ربيع الأول",
      "day": 28
    },
    "determination": {
      "status": "confirmed",
      "month_started_on": "2026-08-24",
      "month_length": 30,
      "sighted_in": ["Saudi Arabia (Tumair)", "Indonesia (Sukabumi)"],
      "decision_summary": "Crescent sighted on the evening of 23 Aug 2026 in Tumair and Sukabumi; new month declared globally from 24 Aug 2026.",
      "references_url": "/api/v1/months/1448/3"
    },
    "next_observation_date": "2026-09-21",
    "notes": "One valid testimony anywhere starts the month for all (no day boundary). A late testimony may revise today's date intraday; check 'status' and 'warning'."
  },
  "meta": { "api_version": "v1", "methodology": "Testimony-based global moon-sighting (one valid sighting anywhere starts the month for all)." }
}
```

Aturan revisi intraday (konsekuensi "tanpa batas hari"): bila kesaksian sah masuk terlambat pada hari-H, tanggal Gregorian yang sama berubah dari hari ke-30 bulan lama menjadi tanggal 1 bulan baru secara retroaktif. Dalam kasus ini API mengembalikan data baru + `"warning": "Revised intraday after late testimony received."` dan `status` bulan terkait (`provisional` bila baru 1 kesaksian).

Bila tanggal jatuh di bulan yang masih `provisional/draft` → tetap kembalikan data + `"status": "provisional"` + `"warning": "Awaiting confirmation; may change after further verification."` Bila tanggal di luar cakupan data (belum ada rukyat / belum ada bulan) → `404 { error: { code: "OUT_OF_RANGE", message: "..." } }`. Tidak ada prediksi masa depan — tanggal setelah `next_observation_date` yang belum dirukyat selalu `OUT_OF_RANGE`.

### 6.2 `GET /api/v1/convert?gregorian=YYYY-MM-DD&tz=...`

Sama seperti `/today` tapi untuk tanggal arbitrer. Validasi ketat: format tanggal, tolak tanggal invalid (`2026-02-30` → `422 { errors: { gregorian: "..." } }`).

### 6.3 `GET /api/v1/months?hijri_year=1447&status=confirmed&perPage=12&page=1`

List bulan (paling baru dulu). Envelope `{ data: [...], meta: { currentPage, perPage, lastPage, total } }` mengikuti pola `Paginated` yang sudah ada.

Item ringkas: `month_key, hijri_year, hijri_month, month_en, month_ar, start_gregorian, end_gregorian, length_days, status, sighted_in[]`.

### 6.4 `GET /api/v1/months/current` → bulan berjalan + `next_observation_date` (start + 28 hari). Shape detail sama seperti §6.5.

### 6.5 `GET /api/v1/months/:year/:month` (canonical, mis. `/api/v1/months/1447/9`)

Detail penuh: bulan + `sightings[]` + `references[]` + `decision_summary`. Ini URL yang di-link dari `references_url` dan dari web `/hijri/1447-09`.

### Error & versioning

- Error JSON seragam: `{ error: { code, message } }` (`INVALID_TZ`, `INVALID_DATE`, `NOT_FOUND`, `OUT_OF_RANGE`).
- Version di path (`/v1`). Breaking change → `/v2`, `/v1` tetap hidup ≥12 bulan.
- `GET` saja di V1 (read-only publik). Tulis hanya via admin web (session auth), bukan via public API.

---

## 7. Web publik (Inertia + Svelte, SSR)

Semua page publik: render `{ public: true }` + `cacheablePublic()` (HTML identik untuk semua pengunjung, user diambil via `GET /api/session`). Jangan bocorkan `auth.user` ke HTML publik.

| URL | File Svelte | Isi |
|---|---|---|
| `/` | `Home.svelte` (ganti/extend) | Hero: "Today is 28 Rabi' al-Awwal 1448" + status badge + next observation date ("Next moon watching: 21 Sep 2026") + link methodology |
| `/today` | `Today.svelte` | Sama dengan `/` tapi dengan `?tz=` picker + penjelasan no-day-boundary + warning revisi intraday |
| `/calendar?hijri_year=1447` | `Calendar.svelte` | Grid 12 bulan + panjang 29/30 + status badge |
| `/hijri/:key` (`1447-09`) | `MonthDetail.svelte` | Detail: sighted_in, tabel sighting, list references (link keluar), decision summary |
| `/methodology` | `Methodology.svelte` | 6 prinsip §1, FAQ (hisab vs rukyat, istikmal, koreksi) |
| `/sources` | `Sources.svelte` | Daftar publisher terpercaya + cara verifikasi |
| `/docs` | `Docs.svelte` | API docs + contoh `curl` + rate limit + changelog versi |

Admin (private, `requireRole('admin')`, tidak di-cache): `/admin/hijri` (tabel + form draft→publish), form pakai `useForm`.

**As-built Fase 3 (observatory redesign, approved):** palet malam + emas hilal + zamrud
(token `gh-*` di `styles.css`/`tailwind.css`, auth/admin tidak tersentuh); komponen
`Stars` (deterministik, SSR-aman), `Crescent` (fase bulan dari geometri `day`),
`PublicLayout`, `StatusBadge`; `Brand` menjadi sabit emas. Serializer JSON terpusat
di `hijri.ts` (`serializeMonthDetail/Summary`, `getTodayData`) dipakai API + pages.
`NotFound` dual-chrome (publik vs dashboard) + `Layout` toleran `auth` absen
(perbaikan crash SSR render publik).

---

## 8. SOP editorial bulanan (ini yang membuat situs dipercaya)

Prinsip sumber: **independen, tidak wajib ikut Saudi.** Semua negara/lembaga bobotnya sama — di mana ada kesaksian sah, di situ sah. Setiap bulan editor **mencari referensi putusan yang benar-benar terjadi** (pengumuman resmi / kantor berita / kementerian agama / komite hilal) dan mencatatnya sebagai `month_references`.

1. **Hitung tanggal monitoring:** `next_observation_date = start_gregorian + 28 hari` (malam ke-29). Tampilkan di web + API. Tidak ada prediksi bulan depan selain tanggal ini.
2. **Malam rukyat:** pantau semua kanal yang ada (contoh: SPA Saudi, Kemenag RI sidang isbat, JAKIM Malaysia, Brunei, awqaf Yordania/Maroko, komite hilal lokal, moonsighting.com sebagai agregator — bukan otoritas).
3. **Tetapkan:** 1 kesaksian terverifikasi → publish `provisional` langsung (karena tanpa batas hari, kecepatan penting); lengkapi referensi putusan → naikkan ke `confirmed`. Isi `sighting_reports.note_en`: siapa bersaksi, di mana, bagaimana verifikasinya.
4. **Revisi terlambat:** bila kesaksian masuk setelah wilayah lain sudah pagi, tetap tetapkan hari itu sebagai tanggal 1 retroaktif (status `corrected` bila sebelumnya sudah terbit tanggal berbeda) + tulis alasan di `decision_summary_en`.
5. **Publish:** `published_at=now`, `decision_summary_en` 2–5 kalimat menjawab: hilal terlihat di mana, kapan, oleh siapa (kesaksian), kenapa sah global.
6. **Koreksi:** tidak pernah hapus; ubah ke `corrected` + append alasan + tanggal. Umumkan di `/docs` changelog bila berdampak (khususnya Ramadhan/Syawal/Dzulhijjah).
7. **Seed awal sebelum launch:** isi 1448H yang sudah terjadi dari referensi asli
   (scope final — tanpa backfill tahun-tahun lama, keputusan pemilik).
   Bulan berikutnya diisi saat rukyatnya terjadi, lewat `/admin/hijri`.

Aturan sumber: setiap referensi wajib `publisher + url + published_at`; URL mati → ganti dengan arsip (Wayback) + catat. Agregator/blog hanya pelengkap, bukan dasar tunggal.

**Aturan integritas seed (LOCKED, pelajaran insiden demo):** tanggal seed TIDAK BOLEH
dikarang — setiap bulan wajib berjangkar ke referensi nyata yang terverifikasi.
Dummy visual (bila perlu) memakai tahun fiktif yang jelas bukan data.
**Validasi rantai:** `end` bulan N + 1 hari HARUS = `start` bulan N+1
(insiden: Rabi I 1448 tertulis 29 hari padahal istikmal → 30 hari, 12 Sep sempat
jadi lubang OUT_OF_RANGE; diperbaiki + diverifikasi via API).

---

## 9. CDN, cache & performa

As-built (disederhanakan dari rencana dinamis — TTL tetap, terdokumentasi):

- Pages publik: `/` + `/today`: `s-maxage=300, swr=600`; `/calendar`, `/hijri/:key`: `s-maxage=3600, swr=3600`; `/methodology`, `/sources`, `/docs`: `s-maxage=86400, swr=86400`.
- API: `/today|convert|months/current`: `public, s-maxage=3600`, turun ke `300` di dalam jendela rukyat (dihitung server per request); `/months` list: `3600`; `/months/:year/:month` confirmed/corrected: `86400`, selain itu `3600`. Inertia XHR (`X-Inertia`) tidak di-cache sebagai HTML (ikuti pola `_spa=1` yang sudah ada).
- Public API butuh **CORS**: tambah middleware CORS hanya untuk `/api/v1/*` (`Access-Control-Allow-Origin: *`, GET+OPTIONS). Jangan longgarkan CSRF/auth routes.
- Target: TTFB edge <200ms (cache HIT), origin SSR <500ms, tidak ada fetch eksternal saat render (semua dari SQLite).

---

## 10. Keamanan & anti-abuse (public API = permukaan serangan baru)

- Global rate limit tetap; **tambah limiter khusus `/api/v1/*`** yang lebih longgar tapi bounded (mis. 600 req/menit/IP — final di `config.ts`), agar scraper tidak mematikan origin tapi developer wajar tidak ke-block.
- Validasi `tz` terhadap daftar IANA (`Intl.supportedValuesOf('timeZone')`), `date` via regex + calendar check → 422, bukan 500.
- `month_key`/`year`/`month` di-escape via query parameterized (sudah pola `db.ts`); URL referensi divalidasi `https://` saja saat input admin.
- CSP tetap; link referensi keluar pakai `rel="noopener noreferrer"`.
- `/metrics` tetap proteksi token/loopback; jangan expose data user di endpoint publik mana pun.

---

## 11. SEO, i18n & aksesibilitas (syarat "berguna untuk seluruh dunia")

- SEO: `<title>` + meta description per page, canonical URL (`/hijri/1447-09`), sitemap.xml + robots.txt (tambah route di `app.ts` sebagai infra endpoint), OG tags, JSON-LD (`Dataset`/`Article` untuk month detail).
- Satu bahasa konten: **English** (termasuk `decision_summary_en`, `note_en`). Nama bulan Arab ditampilkan sebagai pelengkap (`month_ar`), bukan pengganti. → Diperluas oleh [`PLAN-I18N.md`](PLAN-I18N.md): versi Arab opsional di kolom `_ar`, fallback ke `_en`.
- A11y: badge status punya teks (bukan warna saja), tabel sighting pakai `<th scope>`, kontras ikut token dark-mode yang ada.
- Embed: sediakan snippet `<iframe src="/today?embed=1">` ringan (tanpa nav) — V1 cukup mode `embed=1` yang render minimal.

---

## 12. Testing & CI (suite harus hijau)

- `tests/hijri.test.ts` baru (mirror `tests/app.test.ts`: set `DATABASE_PATH=:memory:` di `beforeAll` SEBELUM import app, `db.close()` di `afterAll`):
  - `/api/v1/today` & `convert` benar untuk tanggal di dalam/di luar cakupan, `tz` invalid → 422, tanggal invalid → 422.
  - Revisi intraday: simulasi kesaksian terlambat → tanggal yang sama berubah dari hari ke-30 ke tanggal 1 + `warning` muncul; cache header jendela rukyat = 300s.
  - `/months/:year/:month` 404 untuk key tak ada; list pagination benar.
  - Aturan domain: tidak bisa publish `confirmed` tanpa sighting `seen+verified` (unit `hijri.ts`).
  - Cache header benar (public untuk API hijri, no-store tidak bocor).
  - Page `/`, `/hijri/1447-09` render 200, `/admin/hijri` butuh login+admin.
- `bun run typecheck` + `bun run test` (`bun test --isolate`, JANGAN plain `bun test`) sebelum merge.

---

## 13. Production readiness checklist

- [x] Seed: arsip tumbuh dari 1448H (scope final, tanpa backfill); methodology/sources/docs terisi
- [ ] `APP_URL=https://globalhilal.org`, `DATABASE_PATH` volume persisten, backup SQLite harian (copy volume / litestream); beli + pasang `globalhilal.org` (DNS → server, TLS via proxy)
- [x] Sitemap, robots, OG, JSON-LD (CSP nonce-safe), favicon — sitemap dinamis dari DB
- [x] CORS + rate-limit API (600/60 + test 429) + cache header diverifikasi via `curl`
- [x] `/health`, `/metrics`, request log + `x-request-id` jalan (bawaan boilerplate; alert prod belum)
- [ ] Docker build (`docker compose up -d --build`) + smoke test — BELUM (tidak ada Docker daemon di mesin dev; jalankan di mesin deploy)
- [x] README: tabel env baru + dokumentasi API ringkas + link `/docs`
- [ ] Kebijakan koreksi + lisensi data (mis. CC-BY dengan atribusi sumber) — kontak `contact@globalhilal.org` sudah di footer

---

## 14. Fase pengerjaan (usulan)

1. **Fase 1 — Data & domain:** migrasi 0006–0008, `db.ts` statements, `hijri.ts` + unit test. ✅ DONE (`tests/hijri.test.ts`, 18 tests)
2. **Fase 2 — Public API:** `hijri-api.routes.ts` + CORS + cache + `tests/hijri-api.test.ts` (API). ✅ DONE (27 tests total, typecheck 0 errors)
3. **Fase 3 — Web publik:** pages + `hijri.routes.ts` + SEO/sitemap. ✅ DONE (`tests/hijri-pages.test.ts`, 101 tests total, typecheck 0 errors) + redesign observatorium approved
4. **Fase 4 — Admin & SOP:** `/admin/hijri` + seed history + methodology copy. ✅ DONE (`tests/hijri-admin.test.ts` — CRUD, guards, aturan publish; 106 tests total, typecheck 0 errors). Scope seed final: 1448H saja (tanpa backfill). Konsol admin siap pakai: sidebar Dashboard/Hijri/Profile/Users, dashboard editorial (status live, butuh perhatian, bulan terbaru, referensi hilang), diverifikasi via playwright (console 0 error).
5. **Fase 5 — Hardening & launch:** rate-limit tuning, docs, backup, smoke test prod. ✅ SEBAGIAN: rate-limit `/api/v1/*` (600/60, `prefixes` di `rate-limit.ts` + test 429), README (env + API), prod-mode smoke test (`build` + `start` + graceful SIGTERM) lolos. Tersisa: Docker build (tidak ada daemon di mesin ini), DNS/TLS `globalhilal.org`, backup SQLite, seed prod via `/admin/hijri`.

---

## 15. Keputusan terkunci (final)

Terkunci (dari pemilik):

1. Syarat sah = kesaksian sesuai hadits. ✅
2. Tidak wajib ikut Saudi; 1 kesaksian sah di mana pun → sah global. ✅
3. Tanpa prediksi masa depan; hanya hitung `next_observation_date` (start + 28 hari). ✅
4. Tanpa batas hari; kesaksian terlambat tetap menjadikan hari itu tanggal 1 (revisi intraday). ✅
5. Referensi = cari putusan yang terjadi tiap bulan, catat sebagai `month_references`. ✅
6. Brand = **GlobalHilal**, domain = **globalhilal.org**. ✅

7. Preseden Rabi' al-Thani 1448 (approved): tidak ada kesaksian sah 11 Sep 2026 di
   mana pun (moonsighting.com kosong; UEA, Indonesia/Kemenag+NU, Amerika Utara,
   Inggris semua istikmal) → mulai **13 Sep 2026** (20 Sep = hari ke-8), MESKIPUN
   tabel hitung Umm al-Qura menulis 12 Sep (hari ke-9). Perbedaan ini dicatat
   eksplisit di `decision_summary_en` — inilah metodologi bekerja sesuai desain. ✅
8. Dispute direkam, bukan disembunyikan: Safar (Saudi 15 Jul vs Amerika Utara
   16 Jul), Rabi I (Saudi 14 Agu vs Inggris 15 Agu) tersimpan sebagai baris
   `not_seen` + catatan di ringkasan. ✅
9. Seed dev terverifikasi: 1448-01 (16 Jun, 29 hari), 1448-02 (15 Jul, 30 hari),
   1448-03 (14 Agu, 30 hari), 1448-04 (13 Sep, berjalan) + 9 sighting + 10 referensi.

Konsekuensi brand yang sudah dikunci:

- `APP_URL=https://globalhilal.org` (prod). Canonical URL, sitemap, robots, OG tags memakai domain ini.
- Email pengirim (bila butuh notifikasi di V2): `no-reply@globalhilal.org` via `MAIL_FROM`.
- Nama produk di UI/API meta: "GlobalHilal — Global moon-sighting Hijri calendar".
