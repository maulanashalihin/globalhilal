/**
 * Fase 3 tests: GlobalHilal public pages (SSR HTML, cache, SEO infra).
 * Boots the full app (with real SSR bundle) against an in-memory DB.
 * Run with: bun test --isolate.
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

	const today = utcToday();
	const startA = addDays(today, -40);
	const startB = addDays(today, -10);
	const mk = (
		key: string, year: number, month: number, en: string, ar: string,
		start: string, end: string | null, len: number | null,
	) => {
		const row = dbm.insertHijriMonth.get(
			key, year, month, en, ar, start, end, len,
			"confirmed", `Crescent sighted; ${en} declared globally.`,
			null, new Date().toISOString(),
		)!;
		dbm.insertSightingReport.get(
			row.id, "Indonesia", "Sukabumi", null, null, addDays(start, -1),
			"seen", "naked_eye", "Sukabumi committee", 1, "Testimony verified.",
		);
		dbm.insertMonthReference.get(
			row.id, `${en} decision`, "Test Publisher",
			`https://example.org/${key}`, start, "Crescent observed.", "official",
		);
	};
	mk("1447-09", 1447, 9, "Ramadan", "رمضان", startA, addDays(startA, 29), 30);
	mk("1447-10", 1447, 10, "Shawwal", "شوال", startB, null, null);
});

afterAll(async () => {
	dbm.db.close();
});

async function get(path: string): Promise<Response> {
	return app.request(`${BASE}${path}`, { method: "GET" });
}

describe("landing + today", () => {
	it("renders / with today's Hijri date and CDN cache", async () => {
		const res = await get("/");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/html");
		expect(res.headers.get("cache-control")).toContain("public");
		const html = await res.text();
		expect(html).toContain("GlobalHilal");
		expect(html).toContain("Shawwal");
		expect(html).toContain("Next moon watching");
	});

	it("renders /today with tz and fallback warning", async () => {
		const res = await get("/today?tz=Asia/Jakarta");
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("Asia/Jakarta");

		const bad = await get("/today?tz=Not/AZone");
		expect(bad.status).toBe(200);
		expect(await bad.text()).toContain("Unknown timezone");
	});
});

describe("calendar + month detail", () => {
	it("renders /calendar with the year grid", async () => {
		const res = await get("/calendar?hijri_year=1447");
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("Ramadan");
		expect(html).toContain("Awaiting rukyat");
	});

	it("renders /hijri/1447-09 with testimony and references", async () => {
		const res = await get("/hijri/1447-09");
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("Ramadan");
		expect(html).toContain("Sukabumi");
		expect(html).toContain("Test Publisher");
		expect(html).toContain("application/ld+json");
	});

	it("returns 404 page for unknown month keys", async () => {
		expect((await get("/hijri/1447-01")).status).toBe(404);
		expect((await get("/hijri/nope")).status).toBe(404);
	});
});

describe("static pages + SEO infra", () => {
	it("renders methodology/sources/docs with long cache", async () => {
		for (const p of ["/methodology", "/sources", "/docs"]) {
			const res = await get(p);
			expect(res.status).toBe(200);
			expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
		}
		expect(await (await get("/methodology")).text()).toContain("testimony");
		expect(await (await get("/docs")).text()).toContain("/api/v1/today");
	});

	it("serves robots.txt and sitemap.xml", async () => {
		const robots = await get("/robots.txt");
		expect(robots.status).toBe(200);
		expect(await robots.text()).toContain("sitemap.xml");

		const sm = await get("/sitemap.xml");
		expect(sm.status).toBe(200);
		expect(sm.headers.get("content-type")).toContain("application/xml");
		const xml = await sm.text();
		expect(xml).toContain("/hijri/1447-09");
		expect(xml).toContain("/methodology");
	});
});
