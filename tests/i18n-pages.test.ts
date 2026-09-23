/**
 * i18n E2E: locale URL prefixes (/en/…, /ar/…) through the real app, geo
 * redirects for prefix-less URLs, localized editorial content,
 * Arabic-Indic digits, cache headers, and the guarantee that the public
 * API stays English. Boots the full app (with the real SSR bundle)
 * against an in-memory DB. Run with: bun test --isolate.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

let app: Awaited<ReturnType<typeof import("../src/server/app")["createApp"]>>;
let dbm: typeof import("../src/server/db");

const BASE = "http://localhost:3000";

function utcToday(): string {
	return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
	const dt = new Date(`${date}T00:00:00Z`);
	dt.setUTCDate(dt.getUTCDate() + n);
	return dt.toISOString().slice(0, 10);
}

beforeAll(async () => {
	process.env.DATABASE_PATH = ":memory:";
	process.env.APP_URL = "http://localhost:3000";
	process.env.RATE_LIMIT_GLOBAL_MAX = "10000";
	process.env.RATE_LIMIT_AUTH_MAX = "1000";
	const { buildClientAssets } = await import("../src/server/assets");
	await buildClientAssets();
	dbm = await import("../src/server/db");
	const { createApp } = await import("../src/server/app");
	app = createApp({ version: "test", js: "app.js", css: "app.css" });

	const start = addDays(utcToday(), -5);
	const row = dbm.insertHijriMonth.get(
		"1448-04", 1448, 4, "Rabi' al-Thani", "ربيع الثاني",
		start, null, null, "confirmed",
		"Crescent sighted in Tumair; Rabi' al-Thani declared globally.",
		"رُئي الهلال في تمير؛ أُعلن ربيع الثاني عالميًا.",
		null, new Date().toISOString(),
	)!;
	dbm.insertSightingReport.get(
		row.id, "Saudi Arabia", "Tumair", null, null, addDays(start, -1),
		"seen", "naked_eye", "Tumair committee", 1, "Testimony verified.",
		"شهادة موثَّقة.",
	);
	dbm.insertMonthReference.get(
		row.id, "SPA announcement", "إعلان وكالة الأنباء", "Saudi Press Agency",
		"https://example.org/1448-04", start, "Crescent observed.",
		"رُئي الهلال.", "official",
	);

	// A published month with no Arabic at all → English fallback on AR pages.
	const bareStart = addDays(utcToday(), -60);
	const bare = dbm.insertHijriMonth.get(
		"1448-03", 1448, 3, "Rabi' al-Awwal", "ربيع الأول",
		bareStart, addDays(bareStart, 29), 30, "confirmed",
		"English-only summary text.", "", null, new Date().toISOString(),
	)!;
	dbm.insertSightingReport.get(
		bare.id, "Indonesia", "Sukabumi", null, null, addDays(bareStart, -1),
		"seen", "naked_eye", "Sukabumi committee", 1, "Verified.", "",
	);
});

afterAll(async () => {
	dbm.db.close();
});

const get = (path: string, headers: Record<string, string> = {}) =>
	app.request(`${BASE}${path}`, { method: "GET", headers });

const ARABIC_DIGIT_RE = /[\u0660-\u0669]/;

describe("locale prefixes on public pages", () => {
	it("serves Arabic (RTL, Arabic digits, Arabic summary) at /ar", async () => {
		const res = await get("/ar");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-language")).toBe("ar");
		expect(res.headers.get("cache-control")).toContain("public");
		const html = await res.text();
		expect(html).toContain('<html lang="ar" dir="rtl">');
		expect(html).toContain("رُئي الهلال في تمير");
		expect(html).not.toContain("Crescent sighted in Tumair");
		expect(html).toMatch(ARABIC_DIGIT_RE);
		expect(html).toContain("الترقب القادم للهلال");
		// Same-page links keep the prefix (SPA navigation stays Arabic).
		expect(html).toContain('href="/ar/calendar"');
	});

	it("serves English at /en regardless of geography", async () => {
		const res = await get("/en", { "CF-IPCountry": "SA" });
		expect(res.headers.get("content-language")).toBe("en");
		const html = await res.text();
		expect(html).toContain('<html lang="en" dir="ltr">');
		expect(html).toContain("Crescent sighted in Tumair");
	});

	it("falls back to English content when a month has no Arabic", async () => {
		const res = await get("/ar/hijri/1448-03");
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain('<html lang="ar" dir="rtl">');
		expect(html).toContain("English-only summary text.");
		// Chrome (dictionary) is still Arabic.
		expect(html).toContain("الشهادات");
	});

	it("localizes the witness form chrome and month names", async () => {
		const res = await get("/ar/contribute");
		const html = await res.text();
		expect(html).toContain("ربيع الثاني");
		expect(html).toContain("أرسل الشهادة");
	});

	it("localizes place names in sighting reports", async () => {
		const res = await get("/ar/hijri/1448-04");
		const html = await res.text();
		expect(html).toContain("السعودية · تمير");
		expect(html).not.toContain("Saudi Arabia · Tumair");
	});
});

describe("prefix-less URL redirects", () => {
	it("redirects / by country, never cached", async () => {
		const sa = await get("/", { "CF-IPCountry": "SA" });
		expect(sa.status).toBe(302);
		expect(new URL(sa.headers.get("location")!).pathname).toBe("/ar");
		expect(sa.headers.get("cache-control")).toBe("no-store");

		const id = await get("/", { "CF-IPCountry": "ID" });
		expect(id.status).toBe(302);
		expect(new URL(id.headers.get("location")!).pathname).toBe("/en");
	});

	it("redirects legacy public paths preserving path + query", async () => {
		const res = await get("/today?tz=Asia/Jakarta", { "CF-IPCountry": "EG" });
		expect(res.status).toBe(302);
		const location = new URL(res.headers.get("location")!);
		expect(location.pathname).toBe("/ar/today");
		expect(location.search).toBe("?tz=Asia/Jakarta");

		const month = await get("/hijri/1448-04", { "CF-IPCountry": "ID" });
		expect(new URL(month.headers.get("location")!).pathname).toBe("/en/hijri/1448-04");
	});

	it("leaves auth, admin, API and infra paths alone", async () => {
		// No locale-prefix redirect: either a direct response or an
		// auth-guard redirect (whose target is outside /en|/ar).
		for (const p of ["/login", "/admin/hijri", "/api/v1/today", "/health", "/robots.txt", "/sitemap.xml"]) {
			const res = await get(p);
			const location = res.headers.get("location");
			const target = location ? new URL(location, BASE).pathname : null;
			expect(target == null || !/^\/(en|ar)(\/|$)/.test(target)).toBe(true);
		}
	});
});

describe("public API stays English", () => {
	it("ignores CF-IPCountry and returns the English contract", async () => {
		const res = await get(`/api/v1/today?date=${utcToday()}`, {
			"CF-IPCountry": "SA",
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("content-language")).toBeNull();
		const body = (await res.json()) as {
			data: { determination: { decision_summary: string }; hijri: { month_ar: string } };
		};
		expect(body.data.determination.decision_summary).toBe(
			"Crescent sighted in Tumair; Rabi' al-Thani declared globally.",
		);
		// The Arabic month name is still part of the canonical payload.
		expect(body.data.hijri.month_ar).toBe("ربيع الثاني");
	});

	it("keeps the English month detail contract", async () => {
		const res = await get("/api/v1/months/1448/4", { "CF-IPCountry": "SA" });
		const body = (await res.json()) as {
			data: {
				month: { decision_summary: string };
				sightings: { note: string }[];
				references: { title: string; quote: string }[];
			};
		};
		expect(body.data.month.decision_summary).toContain("Crescent sighted in Tumair");
		expect(body.data.sightings[0]?.note).toBe("Testimony verified.");
		expect(body.data.references[0]?.title).toBe("SPA announcement");
		expect(body.data.references[0]?.quote).toBe("Crescent observed.");
	});
});
