/**
 * GlobalHilal public pages (Inertia, SSR, CDN-cacheable).
 * Every page renders `{ public: true }` (no auth.user in HTML) + a
 * `cacheablePublic` header. New feature pages live here — not in
 * pages.routes.ts (app shell only). See AGENTS.md "Route conventions".
 *
 *   /today?tz=            — Hijri date for a timezone (default UTC)
 *   /calendar?hijri_year= — 12-month grid for a Hijri year
 *   /hijri/:key           — month detail, e.g. /hijri/1447-09
 *   /methodology /sources /docs — static content (long cache)
 */
import { Type as t, type Static } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { cacheablePublic } from "../cache";
import {
	countHijriMonths,
	findPublicHijriMonthByKey,
	insertWitnessReport,
	listPublicHijriMonthsAsc,
	listPublicHijriMonthsDesc,
	listReferencesByMonth,
	listSightingsByMonth,
} from "../db";
import {
	getTodayData,
	isValidGregorianDate,
	MONTH_NAMES_AR,
	MONTH_NAMES_EN,
	monthKey,
	parseMonthKey,
	serializeMonthDetail,
	serializeMonthSummary,
	utcToday,
} from "../hijri";
import { isValidTimezone, todayInTz } from "./hijri-api.routes";
import type { AppEnv } from "../inertia-middleware";
import { clientIp } from "../rate-limit";
import { validateJson } from "../validation";

const reportBody = t.Object(
	{
		monthKey: t.String({ minLength: 6, maxLength: 8 }),
		country: t.String({ minLength: 2, maxLength: 80 }),
		city: t.Optional(t.Union([t.String({ maxLength: 80 }), t.Null()])),
		sightedOn: t.String({ minLength: 10, maxLength: 10 }),
		result: t.Union([t.Literal("seen"), t.Literal("not_seen"), t.Literal("cloudy")]),
		method: t.Union([
			t.Literal("naked_eye"),
			t.Literal("telescope"),
			t.Literal("both"),
			t.Literal("unknown"),
		]),
		reporterName: t.String({ minLength: 2, maxLength: 80 }),
		contact: t.Optional(t.Union([t.String({ maxLength: 160 }), t.Null()])),
		note: t.String({ minLength: 4, maxLength: 1000 }),
	},
	{ additionalProperties: false },
);

type ReportBody = Static<typeof reportBody>;

/** Field messages for the witness form (merged in app.ts). */
export const CONTRIBUTE_VALIDATION_MESSAGES: Record<string, string> = {
	"/monthKey": "Pick a month from the list.",
	"/country": "Country is required.",
	"/sightedOn": "Use a real date YYYY-MM-DD.",
	"/reporterName": "Tell us your name.",
	"/note": "Describe what you saw (at least a few words).",
};

export const hijriRoutes = () => {
	const app = new Hono<AppEnv>();

	app.use("/today", cacheablePublic(300, 600));
	app.get("/today", async (c) => {
		const rawTz = c.req.query("tz") ?? "UTC";
		const tz = isValidTimezone(rawTz) ? rawTz : "UTC";
		const date = todayInTz(tz);
		const today = await getTodayData(date, tz);
		return c.var.inertia.render(
			"Today",
			{ tz, today, tzFallback: tz !== rawTz ? rawTz : null },
			{ public: true },
		);
	});

	app.use("/calendar", cacheablePublic(3600, 3600));
	app.get("/calendar", (c) => {
		const all = listPublicHijriMonthsAsc.all();
		const years = [...new Set(all.map((r) => r.hijriYear))].sort((a, b) => b - a);
		const selectedYear =
			Number(c.req.query("hijri_year")) || years[0] || null;
		const byMonth = new Map(
			all.filter((r) => r.hijriYear === selectedYear).map((r) => [r.hijriMonth, r]),
		);
		const months = MONTH_NAMES_EN.map((nameEn, i) => {
			const m = i + 1;
			const row = byMonth.get(m);
			if (row) return serializeMonthSummary(row, listSightingsByMonth.all(row.id));
			return {
				hijri_year: selectedYear,
				hijri_month: m,
				month_key: selectedYear ? `${selectedYear}-${String(m).padStart(2, "0")}` : null,
				month_en: nameEn,
				month_ar: MONTH_NAMES_AR[i],
				start_gregorian: null,
				end_gregorian: null,
				length_days: null,
				status: "awaiting",
				sighted_in: [],
			};
		});
		return c.var.inertia.render(
			"Calendar",
			{ years, selectedYear, months },
			{ public: true },
		);
	});

	app.use("/hijri/*", cacheablePublic(3600, 3600));
	app.get("/hijri/:key", (c) => {
		const parsed = parseMonthKey(c.req.param("key") ?? "");
		const row = parsed
			? findPublicHijriMonthByKey.get(
					`${parsed.year}-${String(parsed.month).padStart(2, "0")}`,
				)
			: undefined;
		if (!parsed || !row) {
			return c.var.inertia.render("NotFound", {}, { status: 404, public: true });
		}
		const detail = serializeMonthDetail(
			row,
			listSightingsByMonth.all(row.id),
			listReferencesByMonth.all(row.id),
		);
		return c.var.inertia.render("MonthDetail", { detail }, { public: true });
	});

	const staticCache = cacheablePublic(86400, 86400);
	app.use("/methodology", staticCache);
	app.get("/methodology", (c) =>
		c.var.inertia.render("Methodology", {}, { public: true }),
	);

	// Witness reports: anyone worldwide can submit a moon-sighting report.
	// Anti-spam: one submission per IP per day (UNIQUE(ip_hash, day) —
	// restart-proof; no raw IPs stored).
	app.use("/contribute", cacheablePublic(300, 600));
	app.get("/contribute", (c) => {
		const months = listPublicHijriMonthsDesc.all(4, 0).map((r) => ({
			month_key: r.monthKey,
			month_en: r.monthEn,
		}));
		return c.var.inertia.render(
			"Contribute",
			{ months, submitted: c.req.query("submitted") === "1" },
			{ public: true },
		);
	});
	app.post("/contribute", validateJson(reportBody), (c) => {
		const page = c.var.inertia;
		const body = c.req.valid("json") as ReportBody;
		const parsed = parseMonthKey(body.monthKey);
		if (!parsed) {
			return page.error("Contribute", { monthKey: "Pick a month from the list." });
		}
		if (!isValidGregorianDate(body.sightedOn)) {
			return page.error("Contribute", { sightedOn: "Use a real date YYYY-MM-DD." });
		}
		const key = monthKey(parsed.year, parsed.month);
		const hash = createHash("sha256").update(clientIp(c)).digest("hex");
		try {
			insertWitnessReport.get(
				key,
				body.country,
				body.city ?? null,
				body.sightedOn,
				body.result,
				body.method,
				body.reporterName,
				body.contact ?? null,
				body.note,
				hash,
				utcToday(),
			);
		} catch {
			// UNIQUE(ip_hash, day) — second submission from this IP today.
			// 422 (not 429) so Inertia populates the form error reliably.
			return page.error("Contribute", {
				note: "You have already submitted a report today. Please try again tomorrow.",
			});
		}
		return page.redirect("/contribute?submitted=1");
	});
	app.use("/sources", staticCache);
	app.get("/sources", (c) =>
		c.var.inertia.render("Sources", {}, { public: true }),
	);
	app.use("/docs", staticCache);
	app.get("/docs", (c) => {
		const total = countHijriMonths.get()?.n ?? 0;
		return c.var.inertia.render("Docs", { total }, { public: true });
	});

	return app;
};

/** Re-exported for pages.routes.ts `/` (owned by the app shell). */
export async function homeProps() {
	const date = utcToday();
	const today = await getTodayData(date, "UTC");
	return { today };
}
