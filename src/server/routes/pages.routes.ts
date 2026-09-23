/**
 * Page routes: the Inertia app-shell pages (/, /dashboard, /admin).
 * Feature pages get their own `<feature>.routes.ts` — see AGENTS.md
 * "Route conventions".
 *
 * `/` is a **public, CDN-cacheable** page: rendered with `{ public: true }`
 * so the HTML contains no user-specific data. Cloudflare caches the
 * response (s-maxage=300, SWR=600). The client fetches user identity via
 * `GET /api/session` after hydration. Auth pages (/dashboard, /admin) are
 * private and never cached.
 */
import { Hono } from "hono";
import { requireAuth, requireRole } from "../auth";
import { cacheablePublic } from "../cache";
import { countUsers, listHijriMonthsAsc, listReferencesByMonth, listUsers, recentUsers, toPublicUser } from "../db";
import type { AppEnv } from "../inertia-middleware";
import type { DashboardStats, Paginated, User } from "../../shared/types";
import { getTodayData, utcToday } from "../hijri";
import { homeProps } from "./hijri.routes";

function dashboardStats(): Promise<DashboardStats> {
	return (async () => {
		const months = listHijriMonthsAsc.all();
		const withRefs = new Set(
			months.filter((m) => listReferencesByMonth.all(m.id).length > 0).map((m) => m.id),
		);
		const recent = [...months].reverse().slice(0, 5);
		return {
			userCount: countUsers.get()?.n ?? 0,
			recentUsers: recentUsers.all(5).map(toPublicUser),
			today: await getTodayData(utcToday(), "UTC"),
			monthCount: months.length,
			draftCount: months.filter((m) => m.status === "draft").length,
			provisionalCount: months.filter((m) => m.status === "provisional").length,
			monthsMissingReferences: months
				.filter((m) => !withRefs.has(m.id) && m.status !== "draft")
				.map((m) => ({ month_key: m.monthKey, month_en: m.monthEn })),
			recentMonths: recent.map((m) => ({
				month_key: m.monthKey,
				month_en: m.monthEn,
				start_gregorian: m.startGregorian,
				status: m.status,
			})),
		};
	})();
}

export const pageRoutes = () => {
	const app = new Hono<AppEnv>();

	// GlobalHilal landing — public, CDN-cacheable (5 min TTL, 10 min SWR).
	// Rendered with { public: true } so no auth.user in the page props;
	// the client fetches user identity via GET /api/session.
	app.use("/", cacheablePublic(300, 600));
	app.get("/", async (c) =>
		c.var.inertia.render("Home", await homeProps(c.var.locale), { public: true }),
	);
	app.get("/dashboard", requireAuth, async (c) =>
		c.var.inertia.render("Dashboard", { stats: await dashboardStats() }),
	);
	app.get("/admin", requireRole("admin"), (c) => {
		const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
		const perPage = Math.min(
			100,
			Math.max(1, Number(c.req.query("perPage") ?? 10) || 10),
		);
		const total = countUsers.get()?.n ?? 0;
		const users: Paginated<User> = {
			data: listUsers.all(perPage, (page - 1) * perPage).map(toPublicUser),
			meta: {
				currentPage: page,
				perPage,
				lastPage: Math.max(1, Math.ceil(total / perPage)),
				total,
			},
		};
		return c.var.inertia.render("Admin", { users });
	});

	return app;
};
