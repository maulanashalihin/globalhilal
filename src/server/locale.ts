/**
 * Locale resolution for the public site (Arabic / English).
 *
 * Locales live in the URL path — `/en/...` and `/ar/...` — so every
 * locale has its own cache key at the CDN edge and its own shareable,
 * indexable URL. There is deliberately no cookie involved.
 *
 * Two jobs:
 *  - `localeFromPath` — content locale, from the `/en`/`/ar` prefix.
 *    Unknown or missing prefixes resolve to English (auth/admin/API
 *    routes are unprefixed and always English).
 *  - `geoLocale` — which locale to *redirect* a prefix-less public URL
 *    (`/`, `/today`, …) to, from `CF-IPCountry` (Arab League member
 *    states get Arabic) with `Accept-Language` as dev/curl fallback.
 *    Redirect responses are marked no-store so the edge never caches one
 *    visitor's geography as everyone's answer.
 *
 * `CF-IPCountry` is a Cloudflare managed header (clients cannot spoof it
 * through the edge), but locale is a display preference only — it grants no
 * privilege, so it is deliberately not treated as a security boundary.
 */
import type { Locale } from "../shared/types";

export type { Locale };

export const DEFAULT_LOCALE: Locale = "en";

/** URL prefixes carrying public content. */
export const LOCALES: readonly Locale[] = ["en", "ar"];

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

/** Content locale from the request path (`/ar/...` → `ar`), or null when
 *  the path carries no locale prefix (auth/admin/API/legacy URLs). */
export function localeFromPath(pathname: string): Locale | null {
	const segment = pathname.split("/", 3)[1];
	return isLocale(segment) ? segment : null;
}

/** Strip a leading `/en` or `/ar` prefix (`/ar/today` → `/today`). */
export function stripLocalePrefix(pathname: string): string {
	const stripped = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
	return stripped === "" ? "/" : stripped;
}

/** Prefix a root-absolute path (`/today` → `/ar/today`, `/` → `/ar`). */
export function withLocalePrefix(locale: Locale, path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
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

/** Redirect target locale for prefix-less public URLs (pure, unit-testable). */
export function geoLocale(input: {
	country?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	const country = input.country?.trim().toUpperCase();
	if (country && AR_COUNTRIES.has(country)) return "ar";
	if (acceptsArabic(input.acceptLanguage)) return "ar";
	return DEFAULT_LOCALE;
}
