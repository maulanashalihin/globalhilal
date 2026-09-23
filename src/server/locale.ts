/**
 * Locale resolution for the public site (Arabic / English).
 *
 * Order (first match wins):
 *   1. `gh_locale` cookie — the visitor's explicit choice from the navbar
 *      switcher. Never written automatically, so deleting it restores the
 *      geo default.
 *   2. `CF-IPCountry` — Cloudflare's country header. Arab League member
 *      states get Arabic, everyone else English.
 *   3. `Accept-Language` — Arabic tags with a non-zero q value. This is a
 *      dev/curl/test fallback only; production always has the CF header.
 *   4. English.
 *
 * `CF-IPCountry` is a Cloudflare managed header (clients cannot spoof it
 * through the edge), but locale is a display preference only — it grants no
 * privilege, so it is deliberately not treated as a security boundary.
 */
import type { Locale } from "../shared/types";

export type { Locale };

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the visitor's explicit language choice. */
export const LOCALE_COOKIE = "gh_locale";

/** Arab League member states (ISO 3166-1 alpha-2) — Arabic by default. */
export const AR_COUNTRIES: ReadonlySet<string> = new Set([
	"AE",
	"BH",
	"DJ",
	"DZ",
	"EG",
	"IQ",
	"JO",
	"KM",
	"KW",
	"LB",
	"LY",
	"MA",
	"MR",
	"OM",
	"PS",
	"QA",
	"SA",
	"SD",
	"SO",
	"SY",
	"TN",
	"YE",
]);

export function isLocale(value: unknown): value is Locale {
	return value === "ar" || value === "en";
}

export function isRtl(locale: Locale): boolean {
	return locale === "ar";
}

/** True when Accept-Language lists Arabic with a non-zero quality. */
function acceptsArabic(header: string | null | undefined): boolean {
	if (!header) return false;
	for (const part of header.split(",")) {
		const [tagRaw, ...params] = part.trim().split(";");
		const tag = (tagRaw ?? "").trim().toLowerCase();
		if (tag !== "ar" && !tag.startsWith("ar-")) continue;
		const q = params
			.map((p) => p.trim())
			.find((p) => p.startsWith("q="))
			?.slice(2);
		if (q !== undefined && Number(q) === 0) continue;
		return true;
	}
	return false;
}

/** Resolve the UI locale from raw request signals (pure, unit-testable). */
export function resolveLocale(input: {
	cookie?: string | null;
	country?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	const cookie = input.cookie?.trim().toLowerCase();
	if (isLocale(cookie)) return cookie;
	const country = input.country?.trim().toUpperCase();
	if (country && AR_COUNTRIES.has(country)) return "ar";
	if (acceptsArabic(input.acceptLanguage)) return "ar";
	return DEFAULT_LOCALE;
}
