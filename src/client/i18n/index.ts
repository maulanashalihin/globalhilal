/**
 * Public-site i18n: locale → dictionary lookup plus display formatters.
 *
 * Pages receive `locale` as a shared Inertia prop (resolved server-side from
 * the `/en`/`/ar` URL prefix, see `src/server/locale.ts`) and pull their
 * copy from `dict(locale)`. All public links go through `withLocale` so the
 * locale prefix is never dropped during SPA navigation.
 */
import type { Locale } from "../../shared/types";
import { ar } from "./ar";
import { en, type Dict } from "./en";

export type { Dict };
export { fmtDate, fmtNum, toArabicDigits } from "./format";
export { cityName, placeLabel, placeName } from "./places";

const dictionaries: Record<Locale, Dict> = { en, ar };

/** Dictionary for a locale; unknown locales fall back to English. */
export function dict(locale: Locale): Dict {
	return dictionaries[locale] ?? en;
}

/** Prefix a root-absolute public path with the locale (`/today` → `/ar/today`). */
export function withLocale(locale: Locale, path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** Same page under another locale, preserving path + query (language switcher). */
export function switchLocalePath(url: string, locale: Locale): string {
	const q = url.indexOf("?");
	const path = q === -1 ? url : url.slice(0, q);
	const search = q === -1 ? "" : url.slice(q);
	const stripped = path.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
	return withLocale(locale, stripped) + search;
}
