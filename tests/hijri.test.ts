/**
 * Fase 1 tests: GlobalHilal domain logic + hijri DB statements.
 * Pure `hijri.ts` unit tests plus migration/statement integration against
 * an in-memory database. Run with: bun test --isolate.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

let hijri: typeof import("../src/server/hijri");
let dbm: typeof import("../src/server/db");

beforeAll(async () => {
	process.env.DATABASE_PATH = ":memory:";
	process.env.APP_URL = "http://localhost:3000";
	hijri = await import("../src/server/hijri");
	dbm = await import("../src/server/db");
});

afterAll(async () => {
	dbm.db.close();
});

describe("month keys", () => {
	it("zero-pads single-digit months", () => {
		expect(hijri.monthKey(1447, 9)).toBe("1447-09");
		expect(hijri.monthKey(1447, 12)).toBe("1447-12");
	});

	it("parses canonical keys and rejects garbage", () => {
		expect(hijri.parseMonthKey("1447-09")).toEqual({ year: 1447, month: 9 });
		expect(hijri.parseMonthKey("1447-9")).toEqual({ year: 1447, month: 9 });
		expect(hijri.parseMonthKey("1447-13")).toBeNull();
		expect(hijri.parseMonthKey("1447")).toBeNull();
		expect(hijri.parseMonthKey("abc")).toBeNull();
	});
});

describe("gregorian helpers", () => {
	it("validates real calendar dates", () => {
		expect(hijri.isValidGregorianDate("2026-09-20")).toBe(true);
		expect(hijri.isValidGregorianDate("2026-02-30")).toBe(false);
		expect(hijri.isValidGregorianDate("2026-13-01")).toBe(false);
		expect(hijri.isValidGregorianDate("20-09-2026")).toBe(false);
		expect(hijri.isValidGregorianDate("")).toBe(false);
	});

	it("adds days across month boundaries", () => {
		expect(hijri.addDays("2026-08-24", 28)).toBe("2026-09-21");
		expect(hijri.addDays("2026-01-31", 1)).toBe("2026-02-01");
	});

	it("computes next observation date as start + 28", () => {
		expect(hijri.nextObservationDate("2026-08-24")).toBe("2026-09-21");
	});

	it("computes 1-based day numbers", () => {
		expect(hijri.dayNumber("2026-08-24", "2026-08-24")).toBe(1);
		expect(hijri.dayNumber("2026-08-24", "2026-09-20")).toBe(28);
	});
});

describe("canPublish", () => {
	const seen = {
		result: "seen",
		verified: true,
	} as unknown as import("../src/shared/types").SightingReport;
	const unseen = {
		result: "not_seen",
		verified: true,
	} as unknown as import("../src/shared/types").SightingReport;

	it("allows draft without testimony", () => {
		expect(hijri.canPublish("draft", [])).toBe(true);
	});

	it("requires a verified seen testimony for any published status", () => {
		expect(hijri.canPublish("provisional", [])).toBe(false);
		expect(hijri.canPublish("confirmed", [unseen])).toBe(false);
		expect(hijri.canPublish("provisional", [seen])).toBe(true);
		expect(hijri.canPublish("confirmed", [seen])).toBe(true);
		expect(hijri.canPublish("corrected", [seen])).toBe(true);
	});
});

describe("resolveForDate", () => {
	const months = [
		{
			id: 1,
			hijriYear: 1447,
			hijriMonth: 9,
			monthKey: "1447-09",
			monthEn: "Ramadan",
			monthAr: "رمضان",
			startGregorian: "2026-02-18",
			endGregorian: "2026-03-19",
			lengthDays: 30,
			status: "confirmed",
		},
		{
			id: 2,
			hijriYear: 1447,
			hijriMonth: 10,
			monthKey: "1447-10",
			monthEn: "Shawwal",
			monthAr: "شوال",
			startGregorian: "2026-03-20",
			endGregorian: null,
			lengthDays: null,
			status: "confirmed",
		},
	] as unknown as import("../src/shared/types").HijriMonth[];

	it("resolves a mid-month date with stored length", () => {
		const r = hijri.resolveForDate(months, "2026-03-01")!;
		expect(r.month.monthKey).toBe("1447-09");
		expect(r.day).toBe(12);
		expect(r.lengthDays).toBe(30);
	});

	it("derives length from the next month start when unstated", () => {
		const r = hijri.resolveForDate(months, "2026-03-25")!;
		expect(r.month.monthKey).toBe("1447-10");
		expect(r.day).toBe(6);
	});

	it("returns null before all data (never back-forecasts)", () => {
		expect(hijri.resolveForDate(months, "2026-01-01")).toBeNull();
	});

	it("never forecasts beyond an open-ended last month (max 30 days)", () => {
		const open = [
			{
				startGregorian: "2026-03-20",
				lengthDays: null,
			},
		] as unknown as import("../src/shared/types").HijriMonth[];
		expect(hijri.resolveForDate(open, "2026-04-18")!.day).toBe(30);
		expect(hijri.resolveForDate(open, "2026-04-19")).toBeNull();
	});

	it("returns null on empty data", () => {
		expect(hijri.resolveForDate([], "2026-03-01")).toBeNull();
	});
});

describe("sightedIn + observation window", () => {
	it("formats verified sightings only", () => {
		const rows = [
			{ country: "Saudi Arabia", city: "Tumair", result: "seen", verified: true },
			{ country: "Indonesia", city: null, result: "seen", verified: true },
			{ country: "Malaysia", city: "KL", result: "seen", verified: false },
			{ country: "Egypt", city: "Cairo", result: "cloudy", verified: true },
		] as unknown as import("../src/shared/types").SightingReport[];
		expect(hijri.sightedIn(rows)).toEqual(["Saudi Arabia (Tumair)", "Indonesia"]);
	});

	it("detects the short-cache observation window", () => {
		const m = { startGregorian: "2026-08-24" } as unknown as import("../src/shared/types").HijriMonth;
		expect(hijri.isObservationWindow(m, "2026-09-21")).toBe(true);
		expect(hijri.isObservationWindow(m, "2026-09-01")).toBe(false);
	});
});

describe("hijri DB statements", () => {
	it("inserts and finds a month by key", () => {
		const row = dbm.insertHijriMonth.get(
			"1447-09",
			1447,
			9,
			"Ramadan",
			"رمضان",
			"2026-02-18",
			"2026-03-19",
			30,
			"confirmed",
			"Crescent sighted; new month declared globally.",
			"رُئي الهلال؛ أُعلن الشهر عالميًا.",
			null,
			new Date().toISOString(),
		)!;
		expect(row.id).toBeGreaterThan(0);
		const found = dbm.findHijriMonthByKey.get("1447-09")!;
		expect(found.monthEn).toBe("Ramadan");
		expect(found.lengthDays).toBe(30);
		expect(found.decisionSummaryAr).toContain("رُئي");
	});

	it("stores sightings and references per month", () => {
		const m = dbm.findHijriMonthByKey.get("1447-09")!;
		const s = dbm.insertSightingReport.get(
			m.id,
			"Saudi Arabia",
			"Tumair",
			null,
			null,
			"2026-02-17",
			"seen",
			"naked_eye",
			"Tumair committee",
			1,
			"Testimony received and verified.",
			"وصلت الشهادة وتم التحقق منها.",
		)!;
		expect(s.id).toBeGreaterThan(0);
		expect(dbm.listSightingsByMonth.all(m.id)).toHaveLength(1);

		const r = dbm.insertMonthReference.get(
			m.id,
			"SPA announcement",
			"إعلان وكالة الأنباء السعودية",
			"Saudi Press Agency",
			"https://example.org/spa-1447-09",
			"2026-02-17",
			"Crescent observed.",
			"رُئي الهلال.",
			"official",
		)!;
		expect(r.id).toBeGreaterThan(0);
		expect(dbm.listReferencesByMonth.all(m.id)).toHaveLength(1);
	});

	it("lists months ascending for date resolution", () => {
		const rows = dbm.listHijriMonthsAsc.all();
		expect(rows.length).toBeGreaterThanOrEqual(1);
		expect(rows[0]!.monthKey).toBe("1447-09");
	});
});
