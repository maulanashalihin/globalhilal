/**
 * App composition: logging → CSRF origin check → security headers →
 * compression → inertia session → global rate limit → routes → error/not-found handlers.
 * Middleware runs in registration order — global middleware must precede
 * the routes they cover.
 */
import { getCookie } from "hono/cookie";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { compress } from "./compress";
import { config } from "./config";
import { rateLimit } from "./rate-limit";
import { readFlash, resolveUser, SESSION_COOKIE } from "./auth";
import { serveAsset } from "./assets";
import { pingDb, toPublicUser } from "./db";
import { Inertia, type InertiaAssets } from "./inertia";
import { inertiaMiddleware, type AppEnv } from "./inertia-middleware";
import type { Server } from "bun";
import { logError, requestLogger } from "./logger";
import { recordRequest, renderMetrics } from "./metrics";
import { authRoutes, VALIDATION_MESSAGES } from "./routes/auth.routes";
import { googleOauthRoutes } from "./routes/google-oauth.routes";
import { hijriApiRoutes } from "./routes/hijri-api.routes";
import {
	CONTRIBUTE_VALIDATION_MESSAGES,
	CONTRIBUTE_VALIDATION_MESSAGES_AR,
	hijriRoutes,
} from "./routes/hijri.routes";
import { listPublicHijriMonthsAsc } from "./db";
import { pageRoutes } from "./routes/pages.routes";
import { apiRoutes } from "./routes/api.routes";
import {
	profileRoutes,
	PROFILE_VALIDATION_MESSAGES,
} from "./routes/profile.routes";
import {
	adminHijriRoutes,
	ADMIN_HIJRI_VALIDATION_MESSAGES,
} from "./routes/admin-hijri.routes";
import { uploadsRoutes } from "./routes/uploads.routes";
import { DEFAULT_LOCALE, geoLocale, localeFromPath, stripLocalePrefix, withLocalePrefix } from "./locale";
import { checkOrigin } from "./security";
import { safeUrl } from "./url";
import { ValidationFailed } from "./validation";
import type { Context } from "hono";
import type { Locale } from "../shared/types";

/** Form routes whose schema-level validation maps back to an Inertia page. */
const COMPONENT_BY_PATH: Record<string, string> = {
	"/register": "Register",
	"/login": "Login",
	"/forgot-password": "ForgotPassword",
	"/reset-password": "ResetPassword",
	"/profile": "Profile",
	"/profile/password": "Profile",
	"/contribute": "Contribute",
};

const VALIDATION_MESSAGES_EN = {
	...VALIDATION_MESSAGES,
	...PROFILE_VALIDATION_MESSAGES,
	...ADMIN_HIJRI_VALIDATION_MESSAGES,
	...CONTRIBUTE_VALIDATION_MESSAGES,
};

/** Field messages by locale — only public (contribute) copy is translated;
 *  auth/admin forms stay English. */
const VALIDATION_MESSAGES_ALL: Record<Locale, Record<string, string>> = {
	en: VALIDATION_MESSAGES_EN,
	ar: { ...VALIDATION_MESSAGES_EN, ...CONTRIBUTE_VALIDATION_MESSAGES_AR },
};

const isUploadsPath = (pathname: string) =>
	pathname === "/uploads" || pathname.startsWith("/uploads/");

const UPLOADS_RE = /^\/uploads(\/|$)/;

// Prefix-less public URLs from the cookie era — redirected (geo, no-store)
// to their /en or /ar equivalent by the locale middleware above.
const LEGACY_PUBLIC_RE =
	/^\/(today|calendar|methodology|sources|docs|contribute|hijri)(\/|$)/;

/**
 * Build the Inertia adapter for error/not-found paths. The global
 * inertiaMiddleware has already run for every request, so `c.var.inertia`
 * is normally set; the fallback only covers exotic failures before it ran.
 */
function inertiaFromContext(
	c: Context<AppEnv>,
	assets: InertiaAssets,
): Inertia {
	const existing = c.get("inertia");
	if (existing) return existing;
	const raw = getCookie(c, SESSION_COOKIE);
	const sessionToken = typeof raw === "string" && raw.length > 0 ? raw : null;
	const row = resolveUser(sessionToken);
	return new Inertia(
		{
			request: c.req.raw,
			headers: Object.fromEntries(c.req.raw.headers.entries()),
			user: row ? toPublicUser(row) : null,
			flash: readFlash(sessionToken),
			sessionToken,
			cspNonce: c.get("cspNonce") ?? "",
			locale: c.get("locale") ?? DEFAULT_LOCALE,
		},
		assets,
	);
}

export function createApp(assets: InertiaAssets) {
	const app = new Hono<AppEnv>();

	app.use(requestLogger);
	app.use(checkOrigin);
	// gzip-compress compressible responses (HTML/CSS/JS/JSON) above 1KB.
	// Custom zlib-based middleware — hono's built-in needs the CompressionStream
	// Web API, which is not reliably present in every Bun 1.3.14 context.
	app.use(compress());
	app.use(
		secureHeaders({
			xFrameOptions: "DENY",
			referrerPolicy: "strict-origin-when-cross-origin",
			permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
			// CSP is set per-request below (needs the per-request nonce from
			// inertiaMiddleware) — not here, where it would be static.
		}),
	);
	app.use(inertiaMiddleware(assets));
	// Locale URL prefixes (no cookies): public content lives under /en/*
	// and /ar/*. Prefix-less legacy URLs (/, /today, /hijri/:key, …)
	// redirect to the geo-appropriate locale (CF-IPCountry → Accept-Language
	// → en) with no-store, so the edge never caches one visitor's geography
	// as everyone's answer. Locale roots are slash-less (/en, /ar);
	// the slash variants redirect onto them.
	app.use(async (c, next) => {
		const url = safeUrl(c.req.url);
		const pathname = url.pathname;
		if (pathname === "/en/" || pathname === "/ar/") {
			url.pathname = pathname.slice(0, 3);
			return Response.redirect(url.toString(), 302);
		}
		if (localeFromPath(pathname)) return next();
		if (pathname !== "/" && !LEGACY_PUBLIC_RE.test(pathname)) return next();
		const locale = geoLocale({
			country: c.req.header("cf-ipcountry"),
			acceptLanguage: c.req.header("accept-language"),
		});
		url.pathname = withLocalePrefix(locale, pathname);
		const status = c.req.method === "GET" || c.req.method === "HEAD" ? 302 : 307;
		return new Response(null, {
			status,
			headers: { location: url.toString(), "cache-control": "no-store" },
		});
	});
	// Per-request CSP with nonce — must run after inertiaMiddleware (which
	// generates the nonce). Inline scripts (theme boot, page payload) and
	// inline styles (Inertia progress bar) carry the nonce; 'unsafe-inline'
	// is no longer needed. /uploads responses get script-src 'none' (stored-XSS
	// guard: content is attacker-controlled bytes with client-declared content-type).
	app.use(async (c, next) => {
		await next();
		const nonce = c.get("cspNonce");
		const isUploads = UPLOADS_RE.test(safeUrl(c.req.url).pathname);
		const csp = [
			`default-src 'self'`,
			isUploads
				? `script-src 'none'`
				: `script-src 'self' 'nonce-${nonce}'`,
			`style-src 'self' 'nonce-${nonce}'`,
			`img-src 'self' data:`,
			`font-src 'self'`,
			`connect-src 'self'`,
			`frame-ancestors 'none'`,
			`base-uri 'self'`,
			`form-action 'self'`,
		].join("; ");
		c.res.headers.set("content-security-policy", csp);
	});
	// Metrics recording — after next() so we know the final status + duration.
	// /metrics itself is excluded (scrape should not count as user traffic).
	app.use(async (c, next) => {
		const start = performance.now();
		await next();
		const pathname = safeUrl(c.req.url).pathname;
		if (pathname !== "/metrics") {
			recordRequest(
				c.req.method,
				pathname,
				c.res.status,
				(performance.now() - start) / 1000,
			);
		}
	});
	// Global rate limit (DDoS baseline) — applied to all routes except
	// /health, /metrics (orchestrator/Prometheus probes), /assets/* (bulk
	// browser fetches), and /.well-known/* (DevTools probes). Auth endpoints
	// get a stricter layer on top (see auth.routes.ts). The limiter is
	// instantiated once so its bucket map persists across requests.
	const globalLimiter = rateLimit({
		max: config.rateLimit.globalMax,
		windowSeconds: config.rateLimit.globalWindow,
	});
	const EXEMPT_PREFIXES = ["/assets/", "/.well-known/"] as const;
	app.use((c, next) => {
		const pathname = safeUrl(c.req.url).pathname;
		if (
			pathname === "/health" ||
			pathname === "/metrics" ||
			EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
		)
			return next();
		return globalLimiter(c, next);
	});

	app.onError(async (err, c) => {
		logError(c, err);
		const pathname = safeUrl(c.req.url).pathname;

		if (err instanceof HTTPException) return err.getResponse();

		// tus endpoints speak JSON + tus headers, never Inertia pages.
		if (isUploadsPath(pathname)) {
			c.header("content-type", "application/json");
			c.header("Tus-Resumable", "1.0.0");
			return c.json({ error: "Internal Server Error" }, 500);
		}

		// Schema validation (TypeBox) → 422 with field errors, Inertia-aware.
		if (err instanceof ValidationFailed) {
			// Public form paths carry a locale prefix (/en/contribute) —
			// strip it before mapping back to the Inertia component.
			const formPath = stripLocalePrefix(pathname);
			const component =
				COMPONENT_BY_PATH[formPath] ??
				(formPath === "/admin/hijri/months"
					? "AdminHijri"
					: formPath.startsWith("/admin/hijri/")
						? "AdminHijriDetail"
						: undefined);
			const errors: Record<string, string> = {};
			const messages = VALIDATION_MESSAGES_ALL[c.get("locale") ?? "en"];
			for (const item of err.errors) {
				const field = item.path.replace(/^\//, "");
				if (field && !errors[field])
					errors[field] = messages[item.path] ?? item.message;
			}
			if (!component) return c.json({ errors }, 422);
			return inertiaFromContext(c, assets).error(component, errors);
		}

		return c.text("Internal Server Error", 500);
	});

	app.notFound((c) => {
		const pathname = safeUrl(c.req.url).pathname;
		// Unmatched /uploads routes (e.g. PUT) stay JSON, not Inertia pages.
		if (isUploadsPath(pathname)) {
			return c.json({ error: "Not found" }, 404);
		}
		// Guests get the public chrome — and therefore the localized shell;
		// signed-in users keep the dashboard chrome on 404s.
		return inertiaFromContext(c, assets).render(
			"NotFound",
			{},
			{ status: 404, public: !c.get("user") },
		);
	});

	app.get("/health", (c) => {
		pingDb.get();
		return c.json({ status: "ok", uptime: process.uptime() });
	});
	// Prometheus/OpenMetrics scrape endpoint. Protected: if METRICS_TOKEN
	// is set, requires `Authorization: Bearer <token>`; otherwise restricted
	// to loopback only (Prometheus scrapes locally in single-server deploys).
	// Counters are in-memory; the gauge (active_sessions) is queried lazily.
	app.get("/metrics", (c) => {
		const token = config.metricsToken;
		if (token) {
			const auth = c.req.header("authorization") ?? "";
			if (auth !== `Bearer ${token}`) {
				return new Response("Unauthorized", { status: 401 });
			}
		} else {
		const server = c.env as unknown as Server<unknown> | undefined;
			const ip = server?.requestIP?.(c.req.raw)?.address ?? "local";
			if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "local") {
				return new Response("Forbidden", { status: 403 });
			}
		}
		return c.text(renderMetrics(), 200, {
			"content-type": "text/plain; version=0.0.4; charset=utf-8",
		});
	});

	// Hono's tail wildcard produces no named param — derive the relative
	// path from c.req.path (see uploads.routes.ts for the same pattern).
	app.get("/assets/*", (c) => {
		const relPath = c.req.path.slice("/assets/".length);
		return serveAsset(relPath);
	});
	// Browser/DevTools well-known probes (e.g. Chrome DevTools JSON) —
	// return a plain 404 so they never reach the Inertia not-found handler.
	app.get("/.well-known/*", () => new Response(null, { status: 404 }));

	// SEO infra endpoints (not feature routes — see AGENTS.md).
	app.get("/robots.txt", () => {
		const body = `User-agent: *\nAllow: /\nSitemap: ${config.appUrl}/sitemap.xml\n`;
		return new Response(body, {
			status: 200,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	});
	app.get("/sitemap.xml", () => {
		// Both locales get their own URLs (separate edge cache keys by
		// construction) with hreflang alternates so crawlers index each
		// language without duplicate-content penalties.
		const paths = [
			"/",
			"/today",
			"/calendar",
			"/contribute",
			"/methodology",
			"/sources",
			"/docs",
			...listPublicHijriMonthsAsc.all().map((r) => `/hijri/${r.monthKey}`),
		];
		const items = paths
			.map(
				(p) =>
					`  <url><loc>${config.appUrl}/en${p}</loc>` +
					`<xhtml:link rel="alternate" hreflang="en" href="${config.appUrl}/en${p}"/>` +
					`<xhtml:link rel="alternate" hreflang="ar" href="${config.appUrl}/ar${p}"/></url>`,
			)
			.join("\n");
		return new Response(
			`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${items}\n</urlset>`,
			{ status: 200, headers: { "content-type": "application/xml; charset=utf-8" } },
		);
	});

	app.route("/uploads", uploadsRoutes());
	app.route("/api/v1", hijriApiRoutes());
	app.route("/en", hijriRoutes());
	app.route("/ar", hijriRoutes());
	app.route("/", adminHijriRoutes());
	app.route("/", apiRoutes());
	app.route("/", authRoutes());
	app.route("/", googleOauthRoutes());
	app.route("/", pageRoutes());
	app.route("/", profileRoutes());

	return app;
}
