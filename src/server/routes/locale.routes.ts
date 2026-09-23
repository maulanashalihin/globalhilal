/**
 * Language switcher endpoint (public pages).
 *
 *   POST /locale  (application/x-www-form-urlencoded)
 *     locale     = ar | en
 *     redirectTo = same-site absolute path (optional)
 *
 * Sets the explicit-choice cookie and 303-bounces back to the page the
 * visitor was on. A native form POST (not Inertia XHR) so the switch always
 * results in a full page load — the server then renders the correct
 * `lang`/`dir` shell. Works without JavaScript (select + noscript button).
 */
import { Hono } from "hono";
import { generateCookie } from "hono/cookie";
import { config } from "../config";
import type { AppEnv } from "../inertia-middleware";
import { isLocale, LOCALE_COOKIE } from "../locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Only same-site absolute paths are accepted (open-redirect guard). */
function safeRedirect(value: unknown): string {
	if (typeof value !== "string") return "/";
	if (!value.startsWith("/") || value.startsWith("//")) return "/";
	return value;
}

export const localeRoutes = () => {
	const app = new Hono<AppEnv>();

	app.post("/locale", async (c) => {
		const body = await c.req.parseBody();
		if (isLocale(body.locale)) {
			c.res.headers.append(
				"set-cookie",
				generateCookie(LOCALE_COOKIE, body.locale, {
					httpOnly: true,
					sameSite: "Lax",
					secure: config.isProd,
					path: "/",
					maxAge: ONE_YEAR_SECONDS,
				}),
			);
		}
		return c.redirect(safeRedirect(body.redirectTo), 303);
	});

	return app;
};
