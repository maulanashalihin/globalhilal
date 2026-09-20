/**
 * Witness-report tests: public /contribute form (1/IP/day) + admin review.
 * Boots the full app against an in-memory DB. Run with: bun test --isolate.
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

	dbm.insertHijriMonth.get(
		"1448-04", 1448, 4, "Rabi' al-Thani", "ربيع الثاني",
		"2026-09-13", null, null, "confirmed", "Seeded.", null, new Date().toISOString(),
	);

	const { hashPassword } = await import("../src/server/auth");
	const hash = await hashPassword("password123");
	dbm.createUserWithRole.get("Boss", "boss@example.com", hash, "admin");
	dbm.createUserWithRole.get("Plebe", "user@example.com", hash, "user");
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

// biome-ignore lint/suspicious/noExplicitAny: test helper returns untyped JSON
async function page(res: Response): Promise<any> {
	return res.json();
}

const goodReport = {
	monthKey: "1448-04",
	country: "Indonesia",
	city: "Bandung",
	sightedOn: "2026-09-11",
	result: "seen",
	method: "naked_eye",
	reporterName: "Hamba Allah",
	contact: null,
	note: "Crescent seen briefly after sunset.",
};

describe("public witness form", () => {
	it("renders the contribute page with month options", async () => {
		const res = await call("/contribute", { headers: xhr });
		expect(res.status).toBe(200);
		const data = await page(res);
		expect(data.component).toBe("Contribute");
		expect(data.props.months.some((m: { month_key: string }) => m.month_key === "1448-04")).toBe(true);
		// CDN cache header applies to browser visits (Inertia XHR excluded).
		const html = await call("/contribute");
		expect(html.headers.get("cache-control")).toContain("public");
	});

	it("rejects invalid reports without consuming the daily quota", async () => {
		const res = await call("/contribute", { method: "POST", headers: xhr, body: { ...goodReport, country: "" } });
		expect(res.status).toBe(422);
	});

	it("accepts one report then blocks the second from the same IP that day", async () => {
		const first = await call("/contribute", { method: "POST", headers: xhr, body: goodReport });
		expect(first.status).toBe(303);
		expect(new URL(first.headers.get("location")!).pathname).toBe("/contribute");

		const rows = dbm.listWitnessReportsByStatus.all("pending");
		expect(rows).toHaveLength(1);
		expect(rows[0]!.reporterName).toBe("Hamba Allah");

		const second = await call("/contribute", { method: "POST", headers: xhr, body: goodReport });
		expect(second.status).toBe(422);
		expect((await page(second)).props.errors.note).toContain("already submitted");
		expect(dbm.listWitnessReportsByStatus.all("pending")).toHaveLength(1);
	});
});

describe("admin review queue", () => {
	async function login(email: string): Promise<string> {
		const res = await call("/login", { method: "POST", headers: xhr, body: { email, password: "password123" } });
		return sessionCookie(res);
	}

	it("blocks non-admins and approves into verified testimony", async () => {
		const userCookie = await login("user@example.com");
		const blocked = await call("/admin/reports", { headers: { cookie: userCookie } });
		expect(blocked.status).toBe(302);

		const admin = await login("boss@example.com");
		const hdr = { ...xhr, cookie: admin };
		const queue = await call("/admin/reports", { headers: hdr });
		expect(queue.status).toBe(200);
		expect((await page(queue)).component).toBe("AdminReports");

		const report = dbm.listWitnessReportsByStatus.all("pending")[0]!;
		const approved = await call(`/admin/reports/${report.id}/approve`, { method: "POST", headers: hdr });
		expect(approved.status).toBe(303);

		const sightings = dbm.listSightingsByMonth.all(dbm.findHijriMonthByKey.get("1448-04")!.id);
		expect(sightings.some((s) => s.witnessOrg === "Hamba Allah" && s.verified === 1)).toBe(true);
		expect(dbm.findWitnessReportById.get(report.id)!.status).toBe("approved");
	});

	it("requires the month draft to exist before approving", async () => {
		const { createHash } = await import("node:crypto");
		const hash = createHash("sha256").update("another-ip").digest("hex");
		const row = dbm.insertWitnessReport.get(
			"1449-01", "Malaysia", null, "2026-06-04", "seen", "naked_eye",
			"Tester", null, "Saw it.", hash, "2026-06-05",
		)!;
		const admin = await login("boss@example.com");
		const res = await call(`/admin/reports/${row.id}/approve`, {
			method: "POST", headers: { ...xhr, cookie: admin },
		});
		expect(res.status).toBe(422);
		expect((await page(res)).props.errors.monthKey).toContain("draft");

		const rejected = await call(`/admin/reports/${row.id}/reject`, {
			method: "POST", headers: { ...xhr, cookie: admin },
		});
		expect(rejected.status).toBe(303);
		expect(dbm.findWitnessReportById.get(row.id)!.status).toBe("rejected");
	});
});
