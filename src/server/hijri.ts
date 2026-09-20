/**
 * GlobalHilal domain logic — transport-independent, no Hono import.
 * Pure functions over Hijri month rows so they are unit-testable without
 * a database. DB access stays in `db.ts`; routes call these helpers.
 *
 * Locked methodology:
 * - One valid testimony anywhere starts the month for all (no Saudi privilege).
 * - No future forecasts; only `nextObservationDate` (start + 28 days).
 * - No day boundary: late testimony revises the same Gregorian date intraday.
 */
import type {
	CalendarMonthSlot,
	HijriMonth,
	HijriStatus,
	MonthDetailJson,
	SightingReport,
	TodayData,
} from "../shared/types";
import type {
	HijriMonthRow,
	MonthReferenceRow,
	SightingReportRow,
} from "./db";

/** Canonical English month names, index 0 = Muharram. */
export const MONTH_NAMES_EN = [
	"Muharram",
	"Safar",
	"Rabi' al-Awwal",
	"Rabi' al-Thani",
	"Jumada al-Ula",
	"Jumada al-Akhirah",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhu al-Qa'dah",
	"Dhu al-Hijjah",
] as const;

/** Arabic month names, index 0 = Muharram. */
export const MONTH_NAMES_AR = [
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الثاني",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
] as const;

/** Canonical month key: '1447-09' (year + zero-padded month). */
export function monthKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

/** Parse 'YYYY-MM' (or 'YYYY-M') into { year, month } or null when invalid. */
export function parseMonthKey(key: string): { year: number; month: number } | null {
	const m = /^(\d{3,5})-(\d{1,2})$/.exec(key.trim());
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]);
	if (!Number.isInteger(year) || year < 1 || month < 1 || month > 12) return null;
	return { year, month };
}

/** Strict 'YYYY-MM-DD' check incl. real calendar days (rejects 2026-02-30). */
export function isValidGregorianDate(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split("-").map(Number) as [number, number, number];
	if (m < 1 || m > 12 || d < 1 || d > 31) return false;
	const dt = new Date(Date.UTC(y, m - 1, d));
	return (
		dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
	);
}

/** Add n days to a 'YYYY-MM-DD' (UTC). Caller must pass a valid date. */
export function addDays(dateStr: string, n: number): string {
	const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
	const dt = new Date(Date.UTC(y, m - 1, d + n));
	const pad = (v: number) => String(v).padStart(2, "0");
	return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Whole-day difference: queryDate - startDate (both 'YYYY-MM-DD'). */
export function diffDays(startDate: string, queryDate: string): number {
	return (
		Date.parse(`${queryDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
	) / 86_400_000;
}

/** Monitoring evening for the next month: start + 28 days (= eve of day 29). */
export function nextObservationDate(startGregorian: string): string {
	return addDays(startGregorian, 28);
}

/** Hijri day number (1-based) for queryDate within a month starting startGregorian. */
export function dayNumber(startGregorian: string, queryDate: string): number {
	return diffDays(startGregorian, queryDate) + 1;
}

/**
 * Whether a month may be published with `status`.
 * Draft needs nothing; any published status requires ≥1 verified 'seen'
 * testimony (syahadah basis). References completeness is checked at the
 * route level (confirmed wants ≥1 reference row).
 */
export function canPublish(status: HijriStatus, sightings: SightingReport[]): boolean {
	if (status === "draft") return true;
	return sightings.some((s) => s.result === "seen" && s.verified);
}

export interface ResolvedDate {
	month: HijriMonth;
	day: number;
	/** Length in days when known (stored, or derived from next month start). */
	lengthDays: 29 | 30 | null;
	next: HijriMonth | null;
}

/**
 * Resolve a Gregorian date to its Hijri month. `months` must be sorted
 * ascending by startGregorian. Returns null when the date precedes all data
 * or falls after available data with no determination (never forecast).
 */
export function resolveForDate(months: HijriMonth[], queryDate: string): ResolvedDate | null {
	if (months.length === 0) return null;
	let current: HijriMonth | null = null;
	let next: HijriMonth | null = null;
	for (let i = 0; i < months.length; i++) {
		const m = months[i]!;
		if (m.startGregorian <= queryDate) {
			current = m;
			next = months[i + 1] ?? null;
		} else {
			next = m;
			break;
		}
	}
	if (!current) return null;
	const day = dayNumber(current.startGregorian, queryDate);
	if (day < 1) return null;
	const derivedLength: 29 | 30 | null = current.lengthDays ??
		(next ? (diffDays(current.startGregorian, next.startGregorian) as 29 | 30) : null);
	if (derivedLength !== null) {
		// Beyond a month of known length with no successor (data gap) —
		// do not forecast, report out-of-range. (With consistent data and
		// an existing successor this is unreachable.)
		if (day > derivedLength) return null;
	} else if (day > 30) {
		// Open-ended last month: a Hijri month is at most 30 days, so any
		// later date needs the next month's determination — never forecast.
		return null;
	}
	return { month: current, day, lengthDays: derivedLength, next };
}

/** "Saudi Arabia (Tumair)" style labels for verified sightings. */
export function sightedIn(sightings: SightingReport[]): string[] {
	return sightings
		.filter((s) => s.result === "seen" && s.verified)
		.map((s) => (s.city ? `${s.country} (${s.city})` : s.country));
}

/** True when queryDate falls in the short-cache observation window. */
export function isObservationWindow(month: HijriMonth, queryDate: string): boolean {
	const watch = nextObservationDate(month.startGregorian);
	return queryDate >= addDays(watch, -2) && queryDate <= addDays(watch, 1);
}

/** 'YYYY-MM-DD' for today in UTC. */
export function utcToday(): string {
	return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Serializers — single source of truth for the public JSON contract.
// Used by both /api/v1/* and the Inertia pages so web and API never diverge.
// ---------------------------------------------------------------------------

export function toSightingReport(row: SightingReportRow): SightingReport {
	return {
		id: row.id,
		monthId: row.monthId,
		country: row.country,
		city: row.city,
		lat: row.lat,
		lon: row.lon,
		sightedOn: row.sightedOn,
		result: row.result as SightingReport["result"],
		method: row.method as SightingReport["method"],
		witnessOrg: row.witnessOrg,
		verified: row.verified === 1,
		noteEn: row.noteEn,
	};
}

/** Full month detail in public snake_case JSON (sighting/reference internals hidden). */
export function serializeMonthDetail(
	row: HijriMonthRow,
	sightingRows: SightingReportRow[],
	referenceRows: MonthReferenceRow[],
): MonthDetailJson {
	const sightings = sightingRows.map(toSightingReport);
	return {
		month: {
			hijri_year: row.hijriYear,
			hijri_month: row.hijriMonth,
			month_key: row.monthKey,
			month_en: row.monthEn,
			month_ar: row.monthAr,
			start_gregorian: row.startGregorian,
			end_gregorian: row.endGregorian,
			length_days: row.lengthDays,
			status: row.status,
			decision_summary: row.decisionSummaryEn,
			published_at: row.publishedAt,
		},
		sightings: sightings.map((s) => ({
			country: s.country,
			city: s.city,
			lat: s.lat,
			lon: s.lon,
			sighted_on: s.sightedOn,
			result: s.result,
			method: s.method,
			witness_org: s.witnessOrg,
			verified: s.verified,
			note: s.noteEn,
		})),
		references: referenceRows.map((r) => ({
			title: r.titleEn,
			publisher: r.publisher,
			url: r.url,
			published_at: r.publishedAt,
			quote: r.quoteEn,
			kind: r.kind,
		})),
		sighted_in: sightedIn(sightings),
		next_observation_date: nextObservationDate(row.startGregorian),
	};
}

/** Compact month summary for lists/calendars. */
export function serializeMonthSummary(
	row: HijriMonthRow,
	sightingRows: SightingReportRow[],
): CalendarMonthSlot {
	const sightings = sightingRows.map(toSightingReport);
	return {
		hijri_year: row.hijriYear,
		hijri_month: row.hijriMonth,
		month_key: row.monthKey,
		month_en: row.monthEn,
		month_ar: row.monthAr,
		start_gregorian: row.startGregorian,
		end_gregorian: row.endGregorian,
		length_days: row.lengthDays,
		status: row.status,
		sighted_in: sightedIn(sightings),
	};
}

/**
 * Build the "today" payload for a Gregorian date. Returns null when no
 * rukyat determination covers the date (never forecasts). DB-backed —
 * imports statements lazily so pure-logic unit tests stay dependency-free.
 */
export async function getTodayData(date: string, tz: string): Promise<TodayData | null> {
	const db = await import("./db");
	const months = db.listPublicHijriMonthsAsc.all().map((r) => ({
		id: r.id,
		hijriYear: r.hijriYear,
		hijriMonth: r.hijriMonth,
		monthKey: r.monthKey,
		monthEn: r.monthEn,
		monthAr: r.monthAr,
		startGregorian: r.startGregorian,
		endGregorian: r.endGregorian,
		lengthDays: r.lengthDays,
		status: r.status,
		decisionSummaryEn: r.decisionSummaryEn,
		publishedAt: r.publishedAt,
		updatedAt: r.updatedAt,
	}) as HijriMonth);
	const resolved = resolveForDate(months, date);
	if (!resolved) return null;
	const { month, day, lengthDays } = resolved;
	const sightings = db.listSightingsByMonth.all(month.id).map(toSightingReport);
	const provisional = month.status === "provisional" || month.status === "draft";
	return {
		gregorian: { date, timezone: tz },
		hijri: {
			year: month.hijriYear,
			month: month.hijriMonth,
			month_key: month.monthKey,
			month_en: month.monthEn,
			month_ar: month.monthAr,
			day,
		},
		determination: {
			status: month.status,
			month_started_on: month.startGregorian,
			month_length: lengthDays,
			sighted_in: sightedIn(sightings),
			decision_summary: month.decisionSummaryEn,
			references_url: `/api/v1/months/${month.hijriYear}/${month.hijriMonth}`,
		},
		...(provisional
			? { warning: "Awaiting confirmation; may change after further verification." }
			: {}),
		next_observation_date: nextObservationDate(month.startGregorian),
		notes:
			"One valid testimony anywhere starts the month for all (no day boundary). A late testimony may revise today's date intraday; check 'status' and 'warning'.",
	};
}
