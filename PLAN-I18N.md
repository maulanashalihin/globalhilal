# PLAN — Bilingual AR/EN (deteksi IP + cookie, tanpa perubahan URL/API)

> Status: **IMPLEMENTED** (Fase 1–4 selesai; 129 tests hijau, typecheck 0 errors).
> Sisa ops: aktifkan IP Geolocation + Cache Rule Cloudflare (checklist §7).
> Stack & konvensi mengikuti `AGENTS.md` + `README.md` — baca dulu sebelum coding.
> Prasyarat produksi: Cloudflare di depan origin (sudah jadi rencana deploy di `README.md`).

## 0. Keputusan yang dikunci pemilik

1. **Deteksi awal dari IP** (`CF-IPCountry`), **selanjutnya dari cookie** (`gh_locale`).
   Negara Arab → `ar`; selain itu → `en`. Cookie selalu menang (pilihan eksplisit user).
2. **Tanpa query `?lang=` dan tanpa prefix path.** Satu URL per halaman; tidak ada
   varian URL untuk bahasa Arab.
3. **Dropdown bahasa di navbar public.** Ganti bahasa = set cookie + muat ulang
   halaman (bukan client-side re-render).
4. **Konten editorial dwibahasa di DB**: `decision_summary`, `note` (kesaksian),
   `title` + `quote` (referensi) punya versi `_ar`; fallback ke `_en` bila kosong.
5. **Admin: cukup warning**, bukan validasi. Publish `confirmed`/`corrected`
   dengan `_ar` kosong tetap boleh; UI menampilkan peringatan.
6. **Angka Arab hanya di tampilan public** (`٠١٢٣٤٥٦٧٨٩`) saat locale `ar`.
   **Form/input tetap angka barat seperti sekarang.**
7. **API `/api/v1/*` tidak berubah** — tetap English, bentuk JSON identik,
   tanpa header/field baru.

Konsekuensi yang diterima (bukan bug): versi Arab tidak punya URL sendiri, jadi
tidak bisa diindeks crawler sebagai halaman terpisah. Detail di §7.

---

## 1. Deteksi locale

Urutan resolusi (fungsi murni, mudah diuji):

```
1. Cookie gh_locale == 'ar' | 'en'   → menang (pilihan user, bertahan 1 tahun)
2. Header CF-IPCountry ∈ AR_COUNTRIES → 'ar'
3. Header Accept-Language (q>0, tag ar-*) → 'ar'   # hanya fallback dev/curl/test
4. Lainnya → 'en'
```

- `AR_COUNTRIES` (22 negara Liga Arab, ISO-3166 alpha-2): `SA AE QA KW BH OM YE IQ
  SY JO LB PS EG SD LY TN DZ MA MR SO DJ KM`.
- Nilai `XX` (unknown), `T1` (Tor), kosong, atau non-ISO → dianggap tidak ada,
  lanjut ke aturan berikutnya. Value di-`trim().toUpperCase()`.
- Cookie **tidak pernah di-set otomatis dari geo**. Cookie hanya menyimpan
  pilihan manual user; tanpa cookie, geo dievaluasi tiap request. Efeknya sama
  dengan "pertama IP, selanjutnya cookie", tapi menghapus cookie = kembali ke
  default geo (perilaku yang diinginkan).
- `CF-IPCountry` adalah managed header Cloudflare → tidak bisa di-spoof lewat
  request client biasa, tapi **tetap bukan batas keamanan**: locale cuma
  preferensi tampilan, tidak memberi privilege apa pun. Origin yang diakses
  langsung (tanpa CF) hanya bisa dipaksa via `Accept-Language`/cookie.

Modul baru (ikut AGENTS rule 2: flat, tanpa Hono):

**`src/server/locale.ts`**
```ts
export type Locale = "ar" | "en";
export const DEFAULT_LOCALE: Locale = "en";
export const AR_COUNTRIES: ReadonlySet<string> = new Set([...]);
export const LOCALE_COOKIE = "gh_locale";
export function isLocale(v: unknown): v is Locale;
export function resolveLocale(input: { cookie?: string; country?: string; acceptLanguage?: string }): Locale;
export function isRtl(locale: Locale): boolean;
```
`resolveLocale` menerima nilai mentah (bukan `Context`) supaya bisa di-unit-test
tanpa request — pemanggil di middleware yang mengekstrak header.

**Middleware**: `src/server/inertia-middleware.ts` menambah
`locale: Locale` di `AppEnv.Variables` dan men-set `c.set("locale", resolveLocale(...))`.
Tidak ada middleware baru — resolusi ini bagian dari per-request context yang
sudah ada (sama seperti `user`/`flash`/`cspNonce`).

**Shell HTML**: `src/server/inertia.ts:259` yang masih hardcoded
`<html lang="en">` menjadi `lang="${locale}" dir="${isRtl ? "rtl" : "ltr"}"`.
`InertiaContext` dapat field `locale`, dan `inertiaFromContext()` di
`src/server/app.ts:74-94` juga mengoper `c.get("locale")` (dipakai 404/500).

---

## 2. Ganti bahasa (navbar) + cookie

Route baru `/locale` → file baru **`src/server/routes/locale.routes.ts`**
(AGENTS rule 1: file = namespace URL), di-mount di `app.ts` lewat
`app.route("/", localeRoutes())`.

```
POST /locale
  body: { locale: "ar" | "en", redirectTo?: string }   # TypeBox, validateJson
  → set cookie gh_locale (maxAge 1 tahun, httpOnly, SameSite=Lax, Secure di prod)
  → 303 redirect ke redirectTo (divalidasi: mulai "/" dan bukan "//") atau "/"
```

- Cookie memakai `generateCookie` dari `hono/cookie` + pola append ke
  `c.res.headers` persis seperti `setSessionCookie` (`src/server/auth.ts:189`) —
  karena handler mengembalikan `Response` custom.
- `checkOrigin` sudah otomatis melindungi POST ini (same-origin).
- `redirectTo` tidak boleh absolut/`//` (open-redirect guard).

**`src/client/components/PublicLayout.svelte`**: tambah dropdown bahasa di
header (dekat tombol Sign in) — form native, bukan `useForm`:

```svelte
<form method="post" action="/locale">
  <input type="hidden" name="redirectTo" value={currentPath} />
  <select name="locale" onchange={(e) => (e.currentTarget.form?.submit())}>
    <option value="en" selected={locale === 'en'}>English</option>
    <option value="ar" selected={locale === 'ar'}>العربية</option>
  </select>
  <noscript><button type="submit">OK</button></noscript>
</form>
```

Karena form POST native + 303 → **full page reload**, `lang`/`dir` di `<html>`
selalu datang dari server dan tidak pernah berubah saat SPA navigation. Tidak
perlu sinkronisasi `dir` di client (`app.ts` tidak berubah). Halaman admin/auth
tidak menampilkan dropdown ini.

---

## 3. Migrasi DB + `db.ts`

**File baru `migrations/0010_bilingual_content.sql`** (jangan sentuh 0006–0009):

```sql
ALTER TABLE hijri_months     ADD COLUMN decision_summary_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE sighting_reports ADD COLUMN note_ar             TEXT NOT NULL DEFAULT '';
ALTER TABLE month_references ADD COLUMN title_ar            TEXT NOT NULL DEFAULT '';
ALTER TABLE month_references ADD COLUMN quote_ar            TEXT NOT NULL DEFAULT '';
```

- `NOT NULL DEFAULT ''` wajib (aturan SQLite `ALTER TABLE` — lihat `README.md`).
- Tanpa backfill: baris lama `_ar=''` → runtime fallback ke `_en`.
- `witness_reports` tidak berubah: laporan publik teks bebas, admin menerjemah
  saat approve (opsional, lihat §6). `country`/`city`/`witness_org` juga teks
  bebas — tetap ditampilkan apa adanya (nama diri; transliterasi menyusul bila
  editor mau, di luar scope).

**`src/server/db.ts`** (semua SQL tetap di sini):

- `HijriMonthRow` + `decisionSummaryAr`, `SightingReportRow` + `noteAr`,
  `MonthReferenceRow` + `titleAr`, `quoteAr`.
- `HIJRI_MONTH_COLS`, `SIGHTING_COLS`, `REFERENCE_COLS` tambah alias
  `decision_summary_ar AS decisionSummaryAr`, dst.
- `insertHijriMonth` (12 → 13 param), `updateHijriMonth` (SET +1), 
  `insertSightingReport` (11 → 12), `insertMonthReference` (7 → 9).
- **16 call-site** `.get(...)` harus ikut diupdate (4 file route + tests) —
  cek dengan `grep -rn "insertHijriMonth\.get\|insertSightingReport\.get\|insertMonthReference\.get\|updateHijriMonth\.get" src tests`.
- Tidak ada statement baru yang perlu: list/find yang ada sudah memakai `*_COLS`.

---

## 4. Domain + serializers (`src/server/hijri.ts`)

- Helper baru `pick(en: string, ar: string, locale: Locale)` →
  `locale === "ar" && ar.trim() ? ar : en`.
- `serializeMonthDetail(row, sightings, refs, locale = "en")` dan
  `serializeMonthSummary(row, sightings, locale = "en")` menerapkan `pick`
  untuk summary/note/title/quote, dan **tetap mengeluarkan `month_en` + `month_ar`
  keduanya** (halaman Arab butuh nama Arab sebagai judul utama).
  Signature default `"en"` → **semua pemanggil API tidak perlu diubah dan output
  JSON byte-identik**.
- `getTodayData(date, tz, locale = "en")` — idem untuk `decision_summary`.
  `warning`/`notes` tetap string English di payload (kontrak API); halaman Arab
  tidak memakainya, lihat §5.
- `src/shared/types.ts`: tambah `decisionSummaryAr/noteAr/titleAr/quoteAr` di
  `HijriMonth`/`SightingReport`/`MonthReference` (tipe internal, bukan JSON
  publik), tambah `export type Locale`, dan `SharedPageProps.locale: Locale`
  (+ `src/shared/inertia.d.ts` supaya `usePage()` typed).

Halaman dapat `locale` lewat shared prop (ditambahkan di `Inertia.page()`,
`src/server/inertia.ts:131-135`) — HTML tetap identik untuk semua user di locale
yang sama, jadi tetap CDN-cacheable.

---

## 5. Route public (halaman)

`src/server/routes/hijri.routes.ts` + `src/server/routes/pages.routes.ts`:

- Semua `render(...)` meneruskan `locale: c.var.locale` dan memanggil serializer
  dengan locale tersebut. `homeProps()` (`hijri.routes.ts:210`) terima parameter
  locale.
- `/contribute`: props `months` tambah `month_ar` (dropdown bulan versi Arab).
- Pesan error/validasi user-facing perlu versi AR, diletakkan **di file route
  masing-masing** (pola yang sudah ada: `CONTRIBUTE_VALIDATION_MESSAGES`):
  - `CONTRIBUTE_VALIDATION_MESSAGES_AR` + inline error di handler (`Month not
    found`, `Use a real date`, `already submitted today`) → pilih map berdasarkan
    `c.var.locale`.
  - `src/server/app.ts:57-62` `VALIDATION_MESSAGES_ALL` menjadi map per-locale:
    `{ en: {...}, ar: {...} }`, dipilih di `onError` (`app.ts:189-205`).
  - Admin/auth tetap English (tidak ada `_AR` di mesin error yang sama).
- Flash message `setFlash` di route admin tetap English (admin console).

**Halaman Arab dan `warning`/`notes`**: karena API tidak boleh berubah, dua
string itu tetap English di payload. Halaman public menampilkan warning dari
**dictionary** berdasarkan `today.determination.status` (`provisional`/`draft` →
teks Arab), bukan dari `today.warning`. `notes` memang tidak dirender hari ini.

---

## 6. Admin (warning-only) — `src/server/routes/admin-hijri.routes.ts`

- Schema TypeBox `updateMonthBody`/`sightingBody`/`referenceBody` tambah field
  **opsional** `decisionSummaryAr`, `noteAr`, `titleAr`, `quoteAr` (maxLength
  sama dengan pasangan `_en`) — tidak ada `.required`, tidak ada pesan validasi
  baru.
- Route detail `/admin/hijri/:key`: kirim nilai mentah `_ar` ke halaman (perlu
  shape admin sendiri karena `MonthDetailJson` publik hanya berisi nilai
  ter-pilih) + `arHints: string[]` berisi field yang kosong saat
  `status ∈ {confirmed, corrected}`.
- `src/client/pages/AdminHijriDetail.svelte`: tambah input/textarea AR di
  samping yang EN, dan banner peringatan (gaya sama dengan banner chain-check
  yang sudah ada di file itu):
  “Arabic translation missing — Arabic readers will see the English text.”
- `AdminReports` approve: `note` laporan publik masuk sebagai `note_en`;
  `note_ar` dibiarkan kosong sampai editor mengisinya — tidak ada perubahan
  alur.
- Dashboard opsional (nice-to-have, boleh ditunda): daftar bulan published yang
  `_ar`-nya kosong di panel “needs attention”.

---

## 7. Cache, CDN, SEO

Masalah inti: `cacheablePublic()` (`src/server/cache.ts:44`) mengeset satu HTML
untuk semua pengunjung. Karena locale ditentukan header/cookie (bukan URL), cache
key **wajib** memuat `CF-IPCountry` + cookie `gh_locale`.

Origin:

- `cacheablePublic(sMaxAge, swr)` + handler public mengeset:
  - `Content-Language: ar|en`
  - `Vary: CF-IPCountry, Cookie, Accept-Language`
  - `Cache-Control` seperti sekarang (TTL tidak berubah).
  - Berlaku juga untuk respons XHR `?_spa=1` yang ikut di-cache CF — jadi
    `Content-Language`/`Vary` diset di middleware, bukan hanya jalur HTML.
- `noStore` (auth/admin/API session) tidak berubah.

Cloudflare (ops checklist, bukan kode):

1. **Network → IP Geolocation = ON** — tanpa ini `CF-IPCountry` tidak dikirim.
2. **Cache Rule** untuk `globalhilal.org/*`: Cache Key → **include header
   `CF-IPCountry`**, **include cookie `gh_locale`** (nama cookie spesifik, jangan
   seluruh header `Cookie`), query string tetap disertakan (agar `_spa=1` tetap
   terpisah). Cache eligibility/`Cache-Control` tetap dari origin.
3. Verifikasi HIT/MISS:
   `curl -sI -H 'CF-IPCountry: SA' https://globalhilal.org/today` →
   `content-language: ar`, request kedua `cf-cache-status: HIT`; ulangi dengan
   `-H 'Cookie: gh_locale=en'` → `content-language: en`.
4. Risiko bila rule salah: pengunjung Arab menerima HTML English (atau
   sebaliknya) sampai TTL habis. Karena itu verifikasi poin 3 masuk checklist
   rilis; test E2E mengunci perilaku origin-nya.

SEO:

- Satu URL per halaman, `canonical` tidak berubah, **tidak ada `hreflang`** dan
  tidak ada entri sitemap tambahan (konsekuensi keputusan §0.2).
- `lang`/`dir`/`Content-Language` per respons sudah benar untuk screen reader &
  mesin pencari.
- Catatan tertulis di README: crawler (tanpa cookie, IP non-Arab) melihat versi
  English. Bila suatu saat SEO Arab penting, opsi termurah adalah prefix path
  `/ar/...` — sengaja tidak dilakukan sekarang.

---

## 8. Client i18n

**Baru: `src/client/i18n/`**

- `index.ts` — `type Dict = typeof en`, `dicts: Record<Locale, Dict>`, helper
  `t(locale)` / `useLocale()`.
- `en.ts`, `ar.ts` — seluruh copy chrome public: nav, footer, hero Home, label
  Today, Calendar, MonthDetail (“Testimonies”, “References”, …), Methodology
  (5 aturan + FAQ), Sources, Docs (kecuali contoh `curl` — tetap ASCII), 
  Contribute (label, opsi select, pesan sukses/gagal), NotFound, label enum
  (`draft/provisional/confirmed/corrected`, `seen/not_seen/cloudy`,
  `naked_eye/telescope/both/unknown`, `official/news/org/other`), judul `<title>`
  + meta description per halaman, warning `provisional`.
- `format.ts` — murni, SSR-safe:
  ```ts
  export function toArabicDigits(v: string | number): string;   // 0-9 → ٠-٩
  export function fmtNum(v: number | string, locale: Locale): string;
  export function fmtDate(iso: string, locale: Locale): string;  // '2026-09-22' → '٢٠٢٦-٠٩-٢٢'
  ```
  Angka Arab **hanya** dipakai di jalur tampilan: hari Hijri, tahun, tanggal
  Gregorian, jumlah, `next_observation_date`, tanggal di tabel. **Tidak** untuk:
  `month_key`, URL, contoh kode Docs, value `<input>`/`<select>` (form tetap
  angka barat), dan id/atribut.

**Halaman yang diubah** (semua menerima prop `locale` dari shared props):
`Home`, `Today`, `MonthDetail`, `Calendar`, `Methodology`, `Sources`, `Docs`,
`Contribute`, `NotFound` + komponen `PublicLayout`, `StatusBadge`.

- Saat `ar`: teks utama = nama bulan Arab (`month_ar`), nama English jadi
  sekunder; seluruh teks pakai `font-arabic` (token sudah ada di
  `src/client/tailwind.css`) dan `dir="rtl"` dari shell.
- **Audit RTL** — ganti utility fisikal ke logikal di halaman public:
  `ml-/mr-` → `ms-/me-`, `pl-/pr-` → `ps-/pe-`, `text-left/right` →
  `text-start/end`, `border-l-/r-` → `border-s-/e-`, `left-/right-` →
  `start-/end-` (atau tambah varian `rtl:` bila tidak ada padanan).
  Ini sumber bug visual terbesar — kerjakan per halaman sambil dicek di browser.
- Blok kode/`curl` di Docs: beri `dir="ltr"` eksplisit.

---

## 9. Testing

- **Update test lama** karena arity statement berubah (16 call-site), termasuk
  helper `mk()` di `tests/hijri-pages.test.ts` dan insert di
  `tests/hijri-admin.test.ts` / `tests/hijri-api.test.ts`.
- **Baru `tests/locale.test.ts`** (unit): matriks resolusi — cookie menang;
  `SA/AE/EG` → ar; `ID/US/XX/T1` → en; `Accept-Language: ar-EG,ar;q=0.9` → ar;
  kosong → en; cookie sampah → diabaikan.
- **Baru `tests/i18n-pages.test.ts`** (E2E, boot app + `DATABASE_PATH=:memory:`,
  mirror `tests/hijri-pages.test.ts`, jalankan `bun test --isolate`):
  - `CF-IPCountry: SA` → HTML `<html lang="ar" dir="rtl">`, header
    `content-language: ar`, summary Arab, digit Arab muncul, summary English
    tidak muncul.
  - `CF-IPCountry: SA` + cookie `gh_locale=en` → English.
  - `CF-IPCountry: ID` + cookie `gh_locale=ar` → Arab.
  - `_ar` kosong → fallback teks English di dalam halaman Arab.
  - `POST /locale` valid → 303 + `Set-Cookie gh_locale=ar`; `redirectTo`
    `https://evil` / `//evil` ditolak; locale invalid → 422.
  - **Regresi API**: `GET /api/v1/today` dengan `CF-IPCountry: SA` tetap English,
    tanpa `content-language`, `decision_summary` = teks EN (kontrak tidak bocor).
  - `Vary` + `Cache-Control` public tetap terpasang di HTML; XHR `_spa=1` tidak
    dapat `Cache-Control: public` (perilaku lama tetap).
- `bun run typecheck` + `bun run test` hijau; verifikasi browser + baca console
  (aturan AGENTS.md “Browser testing”) untuk halaman `ar` dan `en`.

---

## 10. Daftar file

| File | Aksi |
| --- | --- |
| `src/server/locale.ts` | baru — tipe, daftar negara, `resolveLocale` |
| `src/server/routes/locale.routes.ts` | baru — `POST /locale` (cookie + redirect) |
| `migrations/0010_bilingual_content.sql` | baru — 4 kolom `_ar` |
| `src/server/inertia-middleware.ts` | `AppEnv.locale` + resolve |
| `src/server/inertia.ts` | `<html lang dir>` dinamis, `locale` di shared props + `InertiaContext` |
| `src/server/app.ts` | mount `localeRoutes`, map pesan validasi per-locale, `inertiaFromContext` kirim locale |
| `src/server/db.ts` | row types + `*_COLS` + 4 statement |
| `src/server/hijri.ts` | `pick()`, locale param di 3 serializer/`getTodayData` |
| `src/server/routes/hijri.routes.ts` | locale ke render + serializer, pesan AR, `month_ar` di Contribute |
| `src/server/routes/pages.routes.ts` | `homeProps(locale)` |
| `src/server/routes/admin-hijri.routes.ts` | field `_ar` opsional + `arHints` |
| `src/server/cache.ts` | `Content-Language` + `Vary` (semua respons public) |
| `src/shared/types.ts`, `src/shared/inertia.d.ts` | `Locale`, field `_ar`, `SharedPageProps.locale` |
| `src/client/i18n/{index,en,ar,format}.ts` | baru |
| `src/client/components/PublicLayout.svelte` | dropdown bahasa, nav/footer per locale, RTL |
| `src/client/components/StatusBadge.svelte` | label status per locale |
| `src/client/pages/{Home,Today,MonthDetail,Calendar,Methodology,Sources,Docs,Contribute,NotFound}.svelte` | copy via dictionary, digit Arab, RTL |
| `src/client/pages/AdminHijriDetail.svelte` | input AR + banner warning |
| `tests/locale.test.ts`, `tests/i18n-pages.test.ts` | baru |
| `tests/hijri-pages.test.ts`, `tests/hijri-admin.test.ts`, `tests/hijri-api.test.ts` | update arity + assert regresi |
| `README.md` | bagian “Localization (AR/EN)” + setup Cloudflare (IP Geolocation, Cache Rule) |

Tidak berubah: `src/server/routes/hijri-api.routes.ts`, semua route auth/profile/upload,
`api.routes.ts`, tus, rate-limit, metrics, `scripts/seed.ts`, `pages.ts` (tidak
ada komponen page baru).

---

## 11. Fase

1. **Fase 1 — Fondasi locale**: `locale.ts`, middleware, shell `lang/dir`,
   `/locale` + dropdown, dictionary skeleton, pilot `Home` + `PublicLayout`.
   Cek: cookie switch bekerja, `dir` benar, console bersih.
2. **Fase 2 — Pipeline konten**: migrasi `0010`, `db.ts`, serializer `pick`,
   admin field AR + warning, update 16 call-site test. Cek: API tetap identik.
3. **Fase 3 — Halaman lain**: Today, Calendar, MonthDetail, Contribute,
   Methodology, Sources, Docs, NotFound, StatusBadge; digit Arab; audit RTL.
4. **Fase 4 — Cache/ops**: `Vary`/`Content-Language`, CF Cache Rule + verifikasi
   `cf-cache-status`, README, test suite + browser pass.

## 12. Di luar scope (dicatat, tidak dikerjakan)

- Menerjemahkan UI admin/auth ke Arab (chrome admin tetap English).
- Menerjemahkan laporan saksi publik (`witness_reports.note`) otomatis — editor
  mengisi `note_ar` manual saat approve bila perlu.
- Terjemahan nama negara/kota/`witness_org` (teks bebas) dan transliterasi.
- Prefiks `/ar/...` untuk SEO Arab (ditunda sampai ada kebutuhan).
- `Accept-Language` sebagai sinyal utama di produksi (hanya fallback dev/test).
