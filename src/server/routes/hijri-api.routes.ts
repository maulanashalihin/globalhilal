/**
 * GlobalHilal public API v1 — read-only JSON, no auth.
 * Mounted at /api/v1 (see app.ts). All responses English.
 *
 *   GET /api/v1/today[?tz=&date=]
 *   GET /api/v1/convert?gregorian=&tz=
 *   GET /api/v1/months[?hijri_year=&status=&perPage=&page=]
 *   GET /api/v1/months/current
 *   GET /api/v1/months/:year/:month
 *
 * Locked methodology: testimony-based global sighting, no forecasts,
 * no day boundary (late testimony revises the same Gregorian date intraday).
 * Cache: 3600s default, 300s inside the observation window, 86400s for
 * immutable confirmed/corrected month detail. CORS `*` for GET.
 * Serialization lives in `../hijri` (shared with the Inertia pages).
 */
import { Hono } from "hono";
import { config } from "../config";
import {
	countPublicHijriMonths,
	findPublicHijriMonthByKey,
	listPublicHijriMonthsAsc,
	listPublicHijriMonthsByYear,
	listPublicHijriMonthsDesc,
	listReferencesByMonth,
	listSightingsByMonth,
	type HijriMonthRow,
} from "../db";
import {
	dayNumber,
	getTodayData,
	isObservationWindow,
	isValidGregorianDate,
	monthKey,
	resolveForDate,
	serializeMonthDetail,
	serializeMonthSummary,
} from "../hijri";
import type { AppEnv } from "../inertia-middleware";
import { rateLimit } from "../rate-limit";
import type { HijriMonth, HijriStatus } from "../../shared/types";

export const METHODOLOGY =
	"Testimony-based global moon-sighting (one valid sighting anywhere starts the month for all).";

const VALID_STATUSES: HijriStatus[] = ["draft", "provisional", "confirmed", "corrected"];

/** 'YYYY-MM-DD' for today in the given IANA timezone. Throws on bad tz. */
export function todayInTz(tz: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidTimezone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat("en", { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

function cacheFor(ttl: number): string {
	return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl}`;
}

function toMonth(row: HijriMonthRow): HijriMonth {
	return {
		id: row.id,
		hijriYear: row.hijriYear,
		hijriMonth: row.hijriMonth,
		monthKey: row.monthKey,
		monthEn: row.monthEn,
		monthAr: row.monthAr,
		startGregorian: row.startGregorian,
		endGregorian: row.endGregorian,
		lengthDays: row.lengthDays,
		status: row.status as HijriStatus,
		decisionSummaryEn: row.decisionSummaryEn,
		publishedAt: row.publishedAt,
		updatedAt: row.updatedAt,
	};
}

export const hijriApiRoutes = () => {
	const app = new Hono<AppEnv>();

	// Generous per-IP limit for the public API (scraper protection that
	// normal masjid-site/app traffic never hits). Prefix-scoped so the
	// sub-app mount at /api/v1 doesn't throttle unrelated routes.
	app.use(
		rateLimit({
			max: config.rateLimit.apiMax,
			windowSeconds: config.rateLimit.apiWindow,
			prefixes: ["/api/v1"],
		}),
	);
	// CORS for public GET consumers (masjid sites, apps). Scoped to /api/v1/*
	// only — auth routes keep the strict same-origin CSRF policy.
	app.use(async (c, next) => {
		c.header("Access-Control-Allow-Origin", "*");
		c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
		c.header("Access-Control-Max-Age", "86400");
		if (c.req.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Max-Age": "86400",
				},
			});
		}
		await next();
	});

	const todayPayload = async (date: string, tz: string) => {
		const data = await getTodayData(date, tz);
		if (!data) return null;
		const months = listPublicHijriMonthsAsc.all().map(toMonth);
		const resolved = resolveForDate(months, date)!;
		const ttl = isObservationWindow(resolved.month, date) ? 300 : 3600;
		return {
			body: { data, meta: { api_version: "v1", methodology: METHODOLOGY } },
			ttl,
		};
	};

	app.get("/today", async (c) => {
		const tz = c.req.query("tz") ?? "UTC";
		if (!isValidTimezone(tz)) {
			return c.json(
				{ error: { code: "INVALID_TZ", message: `Unknown timezone: ${tz}` } },
				400,
			);
		}
		const date = c.req.query("date") ?? todayInTz(tz);
		if (!isValidGregorianDate(date)) {
			return c.json(
				{
					error: {
						code: "INVALID_DATE",
						message: `Expected YYYY-MM-DD, got: ${date}`,
					},
				},
				422,
			);
		}
		const payload = await todayPayload(date, tz);
		if (!payload) {
			return c.json(
				{
					error: {
						code: "OUT_OF_RANGE",
						message: `No rukyat determination covers ${date}; dates beyond the last observed month are not predicted.`,
					},
				},
				404,
			);
		}
		c.header("Cache-Control", cacheFor(payload.ttl));
		return c.json(payload.body);
	});

	app.get("/convert", async (c) => {
		const gregorian = c.req.query("gregorian") ?? "";
		const tz = c.req.query("tz") ?? "UTC";
		if (!isValidTimezone(tz)) {
			return c.json(
				{ error: { code: "INVALID_TZ", message: `Unknown timezone: ${tz}` } },
				400,
			);
		}
		if (!gregorian || !isValidGregorianDate(gregorian)) {
			return c.json(
				{
					error: {
						code: "INVALID_DATE",
						message: `Expected ?gregorian=YYYY-MM-DD, got: ${gregorian || "(missing)"}`,
					},
				},
				422,
			);
		}
		const payload = await todayPayload(gregorian, tz);
		if (!payload) {
			return c.json(
				{
					error: {
						code: "OUT_OF_RANGE",
						message: `No rukyat determination covers ${gregorian}; dates beyond the last observed month are not predicted.`,
					},
				},
				404,
			);
		}
		c.header("Cache-Control", cacheFor(payload.ttl));
		return c.json(payload.body);
	});

	app.get("/months/current", async (c) => {
		const date = todayInTz("UTC");
		const months = listPublicHijriMonthsAsc.all().map(toMonth);
		const resolved = resolveForDate(months, date);
		if (!resolved) {
			return c.json(
				{
					error: {
						code: "OUT_OF_RANGE",
						message: "No published month covers today yet.",
					},
				},
				404,
			);
		}
		const row = findPublicHijriMonthByKey.get(resolved.month.monthKey)!;
		const detail = serializeMonthDetail(
			row,
			listSightingsByMonth.all(row.id),
			listReferencesByMonth.all(row.id),
		);
		const ttl = isObservationWindow(resolved.month, date) ? 300 : 3600;
		c.header("Cache-Control", cacheFor(ttl));
		return c.json({
			data: {
				...detail,
				day_today_utc: dayNumber(resolved.month.startGregorian, date),
			},
			meta: { api_version: "v1", methodology: METHODOLOGY },
		});
	});

	app.get("/months/:year/:month", (c) => {
		const year = Number(c.req.param("year"));
		const month = Number(c.req.param("month"));
		if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: "No such Hijri month." } },
				404,
			);
		}
		const row = findPublicHijriMonthByKey.get(monthKey(year, month));
		if (!row) {
			return c.json(
				{ error: { code: "NOT_FOUND", message: `No data for ${monthKey(year, month)}.` } },
				404,
			);
		}
		const detail = serializeMonthDetail(
			row,
			listSightingsByMonth.all(row.id),
			listReferencesByMonth.all(row.id),
		);
		const immutable = row.status === "confirmed" || row.status === "corrected";
		c.header("Cache-Control", cacheFor(immutable ? 86400 : 3600));
		return c.json({ data: detail, meta: { api_version: "v1", methodology: METHODOLOGY } });
	});

	app.get("/months", (c) => {
		const yearParam = c.req.query("hijri_year");
		const statusParam = c.req.query("status");
		const perPage = Math.min(100, Math.max(1, Number(c.req.query("perPage") ?? 12) || 12));
		const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);

		if (statusParam && !(VALID_STATUSES as string[]).includes(statusParam)) {
			return c.json(
				{
					error: {
						code: "INVALID_STATUS",
						message: `status must be one of ${VALID_STATUSES.join("|")}`,
					},
				},
				422,
			);
		}

		let rows: HijriMonthRow[];
		if (yearParam !== undefined) {
			const y = Number(yearParam);
			if (!Number.isInteger(y) || y < 1) {
				return c.json(
					{ error: { code: "INVALID_YEAR", message: `Bad hijri_year: ${yearParam}` } },
					422,
				);
			}
			rows = listPublicHijriMonthsByYear.all(y).reverse();
		} else {
			const total = countPublicHijriMonths.get()?.n ?? 0;
			const data = listPublicHijriMonthsDesc.all(perPage, (page - 1) * perPage);
			const filtered = statusParam ? data.filter((r) => r.status === statusParam) : data;
			const body = {
				data: filtered.map((r) => serializeMonthSummary(r, listSightingsByMonth.all(r.id))),
				meta: {
					currentPage: page,
					perPage,
					lastPage: Math.max(1, Math.ceil(total / perPage)),
					total,
				},
			};
			c.header("Cache-Control", cacheFor(3600));
			return c.json({ ...body, meta: { ...body.meta, api_version: "v1" } });
		}

		const months = rows
			.filter((r) => !statusParam || r.status === statusParam)
			.map((r) => serializeMonthSummary(r, listSightingsByMonth.all(r.id)));
		c.header("Cache-Control", cacheFor(3600));
		return c.json({
			data: months,
			meta: { currentPage: 1, perPage: months.length, lastPage: 1, total: months.length, api_version: "v1" },
		});
	});

	return app;
};
