/**
 * Admin Hijri console at /admin/hijri* (requireRole('admin')).
 * List + create months, edit determinations, manage sightings and
 * references. GET renders and POST/PATCH/DELETE actions live together
 * (route conventions — the feature name follows the URL namespace).
 *
 * Publish rule is enforced server-side: any status other than `draft`
 * requires ≥1 verified `seen` testimony (see `canPublish` in ../hijri).
 */
import { Type as t, type Static } from "@sinclair/typebox";
import { Hono } from "hono";
import { requireRole, setFlash } from "../auth";
import {
	addDays,
	canPublish,
	isValidGregorianDate,
	MONTH_NAMES_AR,
	MONTH_NAMES_EN,
	monthKey,
	serializeMonthDetail,
	serializeMonthSummary,
	toSightingReport,
	utcToday,
} from "../hijri";
import {
	countHijriMonths,
	deleteHijriMonth,
	deleteMonthReference,
	deleteSightingReport,
	findHijriMonthById,
	findHijriMonthByKey,
	findWitnessReportById,
	insertHijriMonth,
	insertMonthReference,
	insertSightingReport,
	listHijriMonthsDesc,
	listPublicHijriMonthsAsc,
	listReferencesByMonth,
	listSightingsByMonth,
	listWitnessReportsByStatus,
	setWitnessReportStatus,
	updateHijriMonth,
} from "../db";
import type { AppEnv } from "../inertia-middleware";
import { validateJson } from "../validation";

const createMonthBody = t.Object(
	{
		hijriYear: t.Integer({ minimum: 1, maximum: 9999 }),
		hijriMonth: t.Integer({ minimum: 1, maximum: 12 }),
	},
	{ additionalProperties: false },
);

const updateMonthBody = t.Object(
	{
		startGregorian: t.String({ minLength: 10, maxLength: 10 }),
		endGregorian: t.Union([t.String(), t.Null()]),
		lengthDays: t.Union([t.Integer({ minimum: 29, maximum: 30 }), t.Null()]),
		status: t.Union([
			t.Literal("draft"),
			t.Literal("provisional"),
			t.Literal("confirmed"),
			t.Literal("corrected"),
		]),
		decisionSummaryEn: t.String({ maxLength: 2000 }),
	},
	{ additionalProperties: false },
);

const sightingBody = t.Object(
	{
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
		witnessOrg: t.Optional(t.Union([t.String({ maxLength: 160 }), t.Null()])),
		verified: t.Boolean(),
		noteEn: t.String({ maxLength: 1000 }),
	},
	{ additionalProperties: false },
);

const referenceBody = t.Object(
	{
		titleEn: t.String({ minLength: 4, maxLength: 240 }),
		publisher: t.String({ minLength: 2, maxLength: 160 }),
		url: t.String({ minLength: 12, maxLength: 500 }),
		publishedAt: t.Optional(t.Union([t.String({ maxLength: 10 }), t.Null()])),
		quoteEn: t.String({ maxLength: 1000 }),
		kind: t.Union([
			t.Literal("official"),
			t.Literal("news"),
			t.Literal("org"),
			t.Literal("other"),
		]),
	},
	{ additionalProperties: false },
);

type CreateMonthBody = Static<typeof createMonthBody>;
type UpdateMonthBody = Static<typeof updateMonthBody>;
type SightingBody = Static<typeof sightingBody>;
type ReferenceBody = Static<typeof referenceBody>;

/** Field messages for admin hijri forms (merged in app.ts). */
export const ADMIN_HIJRI_VALIDATION_MESSAGES: Record<string, string> = {
	"/hijriYear": "Enter a valid Hijri year.",
	"/hijriMonth": "Pick a month between 1 and 12.",
	"/startGregorian": "Use a real date YYYY-MM-DD.",
	"/country": "Country is required.",
	"/sightedOn": "Use YYYY-MM-DD.",
	"/titleEn": "Title is required.",
	"/publisher": "Publisher is required.",
	"/url": "Enter the full https:// URL.",
};

export const adminHijriRoutes = () => {
	const app = new Hono<AppEnv>();

	app.get("/admin/hijri", requireRole("admin"), (c) => {
		const total = countHijriMonths.get()?.n ?? 0;
		const months = listHijriMonthsDesc.all(total || 100, 0).map((r) => ({
			...serializeMonthSummary(r, listSightingsByMonth.all(r.id)),
			id: r.id,
			// Draft placeholder date is an implementation detail — hide it.
			start_gregorian: r.startGregorian === "9999-12-31" ? null : r.startGregorian,
		}));
		const latest = listHijriMonthsDesc.all(1, 0)[0] ?? null;
		// Default to the month AFTER the latest in the archive (the one the
		// editor most likely wants to create next), with year rollover.
		const defaultYear = latest
			? latest.hijriMonth === 12
				? latest.hijriYear + 1
				: latest.hijriYear
			: new Date().getFullYear() - 579;
		const defaultMonth = latest ? (latest.hijriMonth % 12) + 1 : 1;
		return c.var.inertia.render("AdminHijri", {
			months,
			defaultYear,
			defaultMonth,
		});
	});

	app.get("/admin/hijri/:key", requireRole("admin"), (c) => {
		const row = findHijriMonthByKey.get(c.req.param("key") ?? "");
		if (!row) return c.var.inertia.render("NotFound", {}, { status: 404 });
		const sRows = listSightingsByMonth.all(row.id);
		const rRows = listReferencesByMonth.all(row.id);
		const base = serializeMonthDetail(row, sRows, rRows);
		// Admin needs row ids for delete actions (public contract omits them).
		const detail = {
			...base,
			sightings: base.sightings.map((s, i) => ({ ...s, id: sRows[i]!.id })),
			references: base.references.map((r, i) => ({ ...r, id: rRows[i]!.id })),
		};
		const next = listPublicHijriMonthsAsc
			.all()
			.find((r) => r.startGregorian > row.startGregorian) ?? null;
		return c.var.inertia.render("AdminHijriDetail", {
			id: row.id,
			detail,
			nextKey: next?.monthKey ?? null,
			// Chain hygiene: this month should end the day before the next starts.
			expectedEnd: next ? addDays(next.startGregorian, -1) : null,
		});
	});

	app.post("/admin/hijri/months", requireRole("admin"), validateJson(createMonthBody), (c) => {
		const body = c.req.valid("json") as CreateMonthBody;
		const page = c.var.inertia;
		const key = monthKey(body.hijriYear, body.hijriMonth);
		if (findHijriMonthByKey.get(key)) {
			return page.error("AdminHijri", { hijriMonth: `${key} already exists.` });
		}
		const idx = body.hijriMonth - 1;
		insertHijriMonth.get(
			key,
			body.hijriYear,
			body.hijriMonth,
			MONTH_NAMES_EN[idx]!,
			MONTH_NAMES_AR[idx]!,
			// Sensible default: observations start today. The editor sets
			// the real testimony date when publishing (validated ≤ 2100).
			utcToday(),
			null,
			null,
			"draft",
			"",
			c.var.user?.id ?? null,
			null,
		);
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: `Draft ${key} created.` });
		return page.redirect(`/admin/hijri/${key}`);
	});

	app.patch("/admin/hijri/months/:id", requireRole("admin"), validateJson(updateMonthBody), (c) => {
		const page = c.var.inertia;
		const row = findHijriMonthById.get(Number(c.req.param("id")));
		if (!row) return page.error("AdminHijriDetail", { status: "Month not found." });
		const body = c.req.valid("json") as UpdateMonthBody;
		if (!isValidGregorianDate(body.startGregorian) || body.startGregorian > "2100-01-01") {
			return page.error("AdminHijriDetail", { startGregorian: "Use a real date YYYY-MM-DD." });
		}
		if (body.endGregorian !== null && !isValidGregorianDate(body.endGregorian)) {
			return page.error("AdminHijriDetail", { endGregorian: "Use a real date YYYY-MM-DD." });
		}
		if (body.endGregorian !== null && body.endGregorian < body.startGregorian) {
			return page.error("AdminHijriDetail", { endGregorian: "End cannot precede start." });
		}
		const sightings = listSightingsByMonth.all(row.id).map(toSightingReport);
		if (!canPublish(body.status, sightings)) {
			return page.error("AdminHijriDetail", {
				status: "Publishing requires at least one verified sighting (seen).",
			});
		}
		updateHijriMonth.get(
			body.startGregorian,
			body.endGregorian,
			body.lengthDays,
			body.status,
			body.decisionSummaryEn,
			row.id,
		);
		if (c.var.sessionToken)
			setFlash(c.var.sessionToken, { success: `${row.monthKey} saved as ${body.status}.` });
		return page.redirect(`/admin/hijri/${row.monthKey}`);
	});

	app.delete("/admin/hijri/months/:id", requireRole("admin"), (c) => {
		const page = c.var.inertia;
		const deleted = deleteHijriMonth.get(Number(c.req.param("id")));
		if (c.var.sessionToken)
			setFlash(c.var.sessionToken, deleted ? { success: "Month deleted." } : { error: "Month not found." });
		return page.redirect("/admin/hijri");
	});

	app.post("/admin/hijri/months/:id/sightings", requireRole("admin"), validateJson(sightingBody), (c) => {
		const page = c.var.inertia;
		const row = findHijriMonthById.get(Number(c.req.param("id")));
		if (!row) return page.error("AdminHijriDetail", { country: "Month not found." });
		const body = c.req.valid("json") as SightingBody;
		if (!isValidGregorianDate(body.sightedOn)) {
			return page.error("AdminHijriDetail", { sightedOn: "Use a real date YYYY-MM-DD." });
		}
		insertSightingReport.get(
			row.id,
			body.country,
			body.city ?? null,
			null,
			null,
			body.sightedOn,
			body.result,
			body.method,
			body.witnessOrg ?? null,
			body.verified ? 1 : 0,
			body.noteEn,
		);
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: "Testimony recorded." });
		return page.redirect(`/admin/hijri/${row.monthKey}`);
	});

	app.delete("/admin/hijri/sightings/:sid", requireRole("admin"), (c) => {
		const page = c.var.inertia;
		deleteSightingReport.get(Number(c.req.param("sid")));
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: "Testimony removed." });
		return page.redirect(c.req.query("back") || "/admin/hijri");
	});

	app.post("/admin/hijri/months/:id/references", requireRole("admin"), validateJson(referenceBody), (c) => {
		const page = c.var.inertia;
		const row = findHijriMonthById.get(Number(c.req.param("id")));
		if (!row) return page.error("AdminHijriDetail", { titleEn: "Month not found." });
		const body = c.req.valid("json") as ReferenceBody;
		if (!/^https:\/\//.test(body.url)) {
			return page.error("AdminHijriDetail", { url: "Enter the full https:// URL." });
		}
		if (body.publishedAt && !isValidGregorianDate(body.publishedAt)) {
			return page.error("AdminHijriDetail", { publishedAt: "Use YYYY-MM-DD." });
		}
		insertMonthReference.get(
			row.id,
			body.titleEn,
			body.publisher,
			body.url,
			body.publishedAt ?? null,
			body.quoteEn,
			body.kind,
		);
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: "Reference added." });
		return page.redirect(`/admin/hijri/${row.monthKey}`);
	});

	app.delete("/admin/hijri/references/:rid", requireRole("admin"), (c) => {
		const page = c.var.inertia;
		deleteMonthReference.get(Number(c.req.param("rid")));
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: "Reference removed." });
		return page.redirect(c.req.query("back") || "/admin/hijri");
	});

	// Witness-report review queue: approve promotes a public report into a
	// verified sighting on its month; reject archives it. Approval requires
	// the month row to exist (create the draft first).
	app.get("/admin/reports", requireRole("admin"), (c) => {
		const pending = listWitnessReportsByStatus.all("pending");
		const decided = [...listWitnessReportsByStatus.all("approved"), ...listWitnessReportsByStatus.all("rejected")]
			.sort((a, b) => b.id - a.id)
			.slice(0, 20);
		return c.var.inertia.render("AdminReports", { pending, decided });
	});

	app.post("/admin/reports/:id/approve", requireRole("admin"), (c) => {
		const page = c.var.inertia;
		const report = findWitnessReportById.get(Number(c.req.param("id") ?? ""));
		if (report?.status !== "pending") {
			if (c.var.sessionToken) setFlash(c.var.sessionToken, { error: "Report not found." });
			return page.redirect("/admin/reports");
		}
		const month = findHijriMonthByKey.get(report.monthKey);
		if (!month) {
			return page.error("AdminReports", {
				monthKey: `Create the draft month ${report.monthKey} first, then approve.`,
			});
		}
		insertSightingReport.get(
			month.id,
			report.country,
			report.city,
			null,
			null,
			report.sightedOn,
			report.result,
			report.method,
			report.reporterName,
			1,
			`${report.note} — submitted via the public witness form${report.contact ? ` (contact: ${report.contact})` : ""}.`,
		);
		setWitnessReportStatus.get("approved", report.id);
		if (c.var.sessionToken)
			setFlash(c.var.sessionToken, { success: `Report accepted as testimony for ${report.monthKey}.` });
		return page.redirect("/admin/reports");
	});

	app.post("/admin/reports/:id/reject", requireRole("admin"), (c) => {
		const page = c.var.inertia;
		setWitnessReportStatus.get("rejected", Number(c.req.param("id")));
		if (c.var.sessionToken) setFlash(c.var.sessionToken, { success: "Report rejected." });
		return page.redirect("/admin/reports");
	});

	return app;
};
