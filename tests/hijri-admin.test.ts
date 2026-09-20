/**
 * Fase 4 tests: admin Hijri console (CRUD + guards + publish rule).
 * Boots the full app (with SSR) against an in-memory DB.
 * Run with: bun test --isolate.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

let app: Awaited<ReturnType<typeof import("../src/server/app")["createApp"]>>;
let dbm: typeof import("../src/server/db");

const BASE = "http://localhost:3000";
const xhr = { "x-inertia": "true" };

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

	const { createUserWithRole } = dbm;
	const { hashPassword } = await import("../src/server/auth");
	const hash = await hashPassword("password123");
	createUserWithRole.get("Boss", "boss@example.com", hash, "admin");
	createUserWithRole.get("Plebe", "user@example.com", hash, "user");
});

afterAll(async () => {
	dbm.db.close();
});

async function call(path: string, opts: { method?: string; headers?: Record<string, string>; body?: unknown; cookie?: string } = {}) {
	const headers = new Headers(opts.headers);
	if (opts.cookie) headers.set("cookie", opts.cookie);
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers.set("content-type", "application/json");
		body = JSON.stringify(opts.body);
	}
	return app.request(`${BASE}${path}`, { method: opts.method ?? "GET", headers, body });
}

function sessionCookie(res: Response): string {
	const getSet = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
	const all = typeof getSet === "function" ? getSet.call(res.headers) : [res.headers.get("set-cookie") ?? ""];
	const found = all.find((c) => c.startsWith("session="));
	return found ? found.split(";")[0]! : "";
}

async function login(email: string): Promise<string> {
	const res = await call("/login", { method: "POST", headers: xhr, body: { email, password: "password123" } });
	expect(res.status).toBe(303);
	return sessionCookie(res);
}

// biome-ignore lint/suspicious/noExplicitAny: test helper returns untyped JSON
async function page(res: Response): Promise<any> {
	return res.json();
}

describe("admin hijri guards", () => {
	it("redirects guests to login and users to dashboard", async () => {
		const guest = await call("/admin/hijri");
		expect(guest.status).toBe(302);
		expect(new URL(guest.headers.get("location")!).pathname).toBe("/login");

		const userCookie = await login("user@example.com");
		const blocked = await call("/admin/hijri", { headers: { cookie: userCookie } });
		expect(blocked.status).toBe(302);
		expect(new URL(blocked.headers.get("location")!).pathname).toBe("/dashboard");
	});

	it("renders the console for admins", async () => {
		const admin = await login("boss@example.com");
		const res = await call("/admin/hijri", { headers: { ...xhr, cookie: admin } });
		expect(res.status).toBe(200);
		expect((await page(res)).component).toBe("AdminHijri");
	});
});

describe("month lifecycle", () => {
	it("creates a draft, rejects duplicates, enforces the publish rule", async () => {
		const admin = await login("boss@example.com");
		const hdr = { ...xhr, cookie: admin };

		const created = await call("/admin/hijri/months", {
			method: "POST", headers: hdr, body: { hijriYear: 1449, hijriMonth: 1 },
		});
		expect(created.status).toBe(303);
		expect(new URL(created.headers.get("location")!).pathname).toBe("/admin/hijri/1449-01");

		const dup = await call("/admin/hijri/months", {
			method: "POST", headers: hdr, body: { hijriYear: 1449, hijriMonth: 1 },
		});
		expect(dup.status).toBe(422);
		expect((await page(dup)).props.errors.hijriMonth).toContain("already exists");

		const row = dbm.findHijriMonthByKey.get("1449-01")!;
		// No testimony yet: publishing must fail.
		const blocked = await call(`/admin/hijri/months/${row.id}`, {
			method: "PATCH", headers: hdr,
			body: { startGregorian: "2026-06-05", endGregorian: null, lengthDays: null, status: "confirmed", decisionSummaryEn: "x" },
		});
		expect(blocked.status).toBe(422);
		expect((await page(blocked)).props.errors.status).toContain("verified sighting");

		// Record testimony, then publish.
		const sight = await call(`/admin/hijri/months/${row.id}/sightings`, {
			method: "POST", headers: hdr,
			body: { country: "Indonesia", city: null, sightedOn: "2026-06-04", result: "seen", method: "naked_eye", witnessOrg: null, verified: true, noteEn: "Two witnesses." },
		});
		expect(sight.status).toBe(303);

		const published = await call(`/admin/hijri/months/${row.id}`, {
			method: "PATCH", headers: hdr,
			body: { startGregorian: "2026-06-05", endGregorian: null, lengthDays: null, status: "confirmed", decisionSummaryEn: "Crescent sighted; new year declared globally." },
		});
		expect(published.status).toBe(303);

		// Public API reflects the new month immediately.
		const api = await call("/api/v1/months/1449/1");
		expect(api.status).toBe(200);
		expect((await api.json()).data.month.status).toBe("confirmed");
	});

	it("validates reference URLs and deletes records", async () => {
		const admin = await login("boss@example.com");
		const hdr = { ...xhr, cookie: admin };
		const row = dbm.findHijriMonthByKey.get("1449-01")!;

		const badUrl = await call(`/admin/hijri/months/${row.id}/references`, {
			method: "POST", headers: hdr,
			body: { titleEn: "Test ruling", publisher: "Test", url: "ftp://example.org/x", publishedAt: null, quoteEn: "", kind: "official" },
		});
		expect(badUrl.status).toBe(422);

		const good = await call(`/admin/hijri/months/${row.id}/references`, {
			method: "POST", headers: hdr,
			body: { titleEn: "Test ruling", publisher: "Test", url: "https://example.org/ruling", publishedAt: "2026-06-04", quoteEn: "Sighted.", kind: "official" },
		});
		expect(good.status).toBe(303);
		const refRow = dbm.listReferencesByMonth.all(row.id)[0]!;

		const delRef = await call(`/admin/hijri/references/${refRow.id}?back=/admin/hijri/1449-01`, { method: "DELETE", headers: hdr });
		expect(delRef.status).toBe(303);
		expect(dbm.listReferencesByMonth.all(row.id)).toHaveLength(0);

		const del = await call(`/admin/hijri/months/${row.id}`, { method: "DELETE", headers: hdr });
		expect(del.status).toBe(303);
		expect(dbm.findHijriMonthByKey.get("1449-01")).toBeNull();
	});
});
