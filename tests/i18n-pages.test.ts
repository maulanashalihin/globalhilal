/**
 * i18n E2E: locale detection through the real app (CF-IPCountry + cookie),
 * localized editorial content, Arabic-Indic digits, cache headers, and the
 * guarantee that the public API stays English. Boots the full app (with the
 * real SSR bundle) against an in-memory DB. Run with: bun test --isolate.
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

describe("locale detection on public pages", () => {
	it("serves Arabic (RTL, Arabic digits, Arabic summary) for SA", async () => {
		const res = await get("/", { "CF-IPCountry": "SA" });
		expect(res.status).toBe(200);
		expect(res.headers.get("content-language")).toBe("ar");
		expect(res.headers.get("vary")).toContain("CF-IPCountry");
		expect(res.headers.get("cache-control")).toContain("public");
		const html = await res.text();
		expect(html).toContain('<html lang="ar" dir="rtl">');
		expect(html).toContain("رُئي الهلال في تمير");
		expect(html).not.toContain("Crescent sighted in Tumair");
		expect(html).toMatch(ARABIC_DIGIT_RE);
		expect(html).toContain("الترقب القادم للهلال");
	});

	it("serves English for non-Arab countries", async () => {
		const res = await get("/", { "CF-IPCountry": "ID" });
		expect(res.headers.get("content-language")).toBe("en");
		const html = await res.text();
		expect(html).toContain('<html lang="en" dir="ltr">');
		expect(html).toContain("Crescent sighted in Tumair");
	});

	it("lets the cookie override geo in both directions", async () => {
		const enInSa = await get("/", {
			"CF-IPCountry": "SA",
			Cookie: "gh_locale=en",
		});
		expect(enInSa.headers.get("content-language")).toBe("en");
		expect(await enInSa.text()).toContain("Crescent sighted in Tumair");

		const arInId = await get("/", {
			"CF-IPCountry": "ID",
			Cookie: "gh_locale=ar",
		});
		expect(arInId.headers.get("content-language")).toBe("ar");
		expect(await arInId.text()).toContain('<html lang="ar" dir="rtl">');
	});

	it("falls back to English content when a month has no Arabic", async () => {
		const res = await get("/hijri/1448-03", { "CF-IPCountry": "SA" });
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain('<html lang="ar" dir="rtl">');
		expect(html).toContain("English-only summary text.");
		// Chrome (dictionary) is still Arabic.
		expect(html).toContain("الشهادات");
	});

	it("localizes the witness form chrome and month names", async () => {
		const res = await get("/contribute", { "CF-IPCountry": "EG" });
		const html = await res.text();
		expect(html).toContain("ربيع الثاني");
		expect(html).toContain("أرسل الشهادة");
	});

	it("localizes place names in sighting reports", async () => {
		const res = await get("/hijri/1448-04", { "CF-IPCountry": "SA" });
		const html = await res.text();
		expect(html).toContain("السعودية · تمير");
		expect(html).not.toContain("Saudi Arabia · Tumair");
	});
});

describe("POST /locale", () => {
	it("sets the cookie and bounces back", async () => {
		const res = await app.request(`${BASE}/locale`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ locale: "ar", redirectTo: "/today?tz=UTC" }),
		});
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("/today?tz=UTC");
		expect(res.headers.get("set-cookie") ?? "").toContain("gh_locale=ar");
	});

	it("rejects off-site redirects and unknown locales", async () => {
		const offSite = await app.request(`${BASE}/locale`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ locale: "ar", redirectTo: "https://evil.example" }),
		});
		expect(offSite.headers.get("location")).toBe("/");

		const protocolRelative = await app.request(`${BASE}/locale`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ locale: "en", redirectTo: "//evil.example" }),
		});
		expect(protocolRelative.headers.get("location")).toBe("/");

		const bogus = await app.request(`${BASE}/locale`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ locale: "fr", redirectTo: "/" }),
		});
		expect(bogus.status).toBe(303);
		expect(bogus.headers.get("set-cookie")).toBeNull();
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
