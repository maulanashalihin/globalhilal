/**
 * Fase 2 tests: GlobalHilal public API v1 (JSON, no auth, CORS, cache).
 * Boots the full app against an in-memory DB and drives it via app.request().
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
	dbm = await import("../src/server/db");
	const { createApp } = await import("../src/server/app");
	// JSON API routes don't need the SSR bundle — dummy assets suffice.
	app = createApp({ version: "test", js: "app.js", css: "app.css" });

	const today = utcToday();
	const startA = addDays(today, -40);
	const startB = addDays(today, -10);

	const seedMonth = (
		key: string,
		year: number,
		month: number,
		en: string,
		ar: string,
		start: string,
		end: string | null,
		len: number | null,
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
		return row;
	};

	seedMonth("1447-09", 1447, 9, "Ramadan", "رمضان", startA, addDays(startA, 29), 30);
	seedMonth("1447-10", 1447, 10, "Shawwal", "شوال", startB, null, null);
});

afterAll(async () => {
	dbm.db.close();
});

async function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
	return app.request(`${BASE}${path}`, { method: "GET", headers: new Headers(headers) });
}

describe("month detail", () => {
	it("returns full detail with sightings + references", async () => {
		const res = await get("/api/v1/months/1447/9");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("application/json");
		const body = await res.json();
		expect(body.data.month.month_en).toBe("Ramadan");
		expect(body.data.sighted_in).toEqual(["Indonesia (Sukabumi)"]);
		expect(body.data.references).toHaveLength(1);
		expect(body.data.next_observation_date).toBeTruthy();
		expect(body.meta.methodology).toContain("Testimony-based");
		// Immutable confirmed detail → long cache.
		expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
	});

	it("404s unknown months", async () => {
		const res = await get("/api/v1/months/1447/1");
		expect(res.status).toBe(404);
		expect((await res.json()).error.code).toBe("NOT_FOUND");
	});

	it("sends CORS headers and answers preflight", async () => {
		const res = await get("/api/v1/months/1447/9");
		expect(res.headers.get("access-control-allow-origin")).toBe("*");
		const pre = await app.request(`${BASE}/api/v1/months/1447/9`, { method: "OPTIONS" });
		expect(pre.status).toBe(204);
	});
});

describe("today + convert", () => {
	it("resolves a date inside the latest month", async () => {
		const date = addDays(utcToday(), -5);
		const res = await get(`/api/v1/today?date=${date}&tz=Asia/Jakarta`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.gregorian).toEqual({ date, timezone: "Asia/Jakarta" });
		expect(body.data.hijri.month_key).toBe("1447-10");
		expect(body.data.hijri.day).toBe(6);
		expect(body.data.determination.status).toBe("confirmed");
		expect(body.data.next_observation_date).toBeTruthy();
		expect(res.headers.get("cache-control")).toContain("public");
	});

	it("rejects bad timezones and dates", async () => {
		const badTz = await get("/api/v1/today?tz=Not/AZone");
		expect(badTz.status).toBe(400);
		expect((await badTz.json()).error.code).toBe("INVALID_TZ");

		const badDate = await get("/api/v1/today?date=2026-02-30");
		expect(badDate.status).toBe(422);
		expect((await badDate.json()).error.code).toBe("INVALID_DATE");
	});

	it("never forecasts: far past and far future are OUT_OF_RANGE", async () => {
		const past = await get("/api/v1/today?date=2000-01-01");
		expect(past.status).toBe(404);
		expect((await past.json()).error.code).toBe("OUT_OF_RANGE");

		const future = await get(`/api/v1/today?date=${addDays(utcToday(), 500)}`);
		expect(future.status).toBe(404);
	});

	it("convert mirrors today for an explicit gregorian date", async () => {
		const date = addDays(utcToday(), -35);
		const res = await get(`/api/v1/convert?gregorian=${date}`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.hijri.month_key).toBe("1447-09");

		const missing = await get("/api/v1/convert");
		expect(missing.status).toBe(422);
	});
});

describe("months list + current", () => {
	it("paginates and filters by year", async () => {
		const res = await get("/api/v1/months?perPage=1&page=1");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.meta.total).toBe(2);

		const year = await get("/api/v1/months?hijri_year=1447");
		expect(year.status).toBe(200);
		expect((await year.json()).data).toHaveLength(2);
	});

	it("current returns the month covering today (UTC)", async () => {
		const res = await get("/api/v1/months/current");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.month.month_key).toBe("1447-10");
		expect(body.data.day_today_utc).toBe(11);
	});
});

describe("draft invisibility", () => {
	it("hides drafts from every public surface", async () => {
		dbm.insertHijriMonth.get(
			"1447-11", 1447, 11, "Dhu al-Qa'dah", "ذو القعدة",
			"9999-12-31", null, null, "draft", "", null, null,
		);
		const get = (p: string) => app.request(`${BASE}${p}`, { method: "GET" });
		expect((await get("/api/v1/months/1447/11")).status).toBe(404);
		const list = await (await get("/api/v1/months?hijri_year=1447")).json();
		expect(list.data.some((m: { month_key: string }) => m.month_key === "1447-11")).toBe(false);
		expect((await get("/hijri/1447-11")).status).toBe(404);
		expect((await get("/calendar?hijri_year=1447")).status).toBe(200);
	});
});

describe("api rate limit", () => {
	it("returns 429 with retry-after once the per-IP budget is spent", async () => {
		const { config } = await import("../src/server/config");
		const savedMax = config.rateLimit.apiMax;
		config.rateLimit.apiMax = 2;
		try {
			const { createApp } = await import("../src/server/app");
			const limited = createApp({ version: "test", js: "app.js", css: "app.css" });
			const hit = () => limited.request(`${BASE}/api/v1/months/1447/9`, { method: "GET" });
			expect((await hit()).status).toBe(200);
			expect((await hit()).status).toBe(200);
			const blocked = await hit();
			expect(blocked.status).toBe(429);
			expect(blocked.headers.get("retry-after")).toBeTruthy();
		} finally {
			config.rateLimit.apiMax = savedMax;
		}
	});
});
