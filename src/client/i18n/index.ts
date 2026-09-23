/**
 * Public-site i18n: locale → dictionary lookup plus display formatters.
 *
 * Pages receive `locale` as a shared Inertia prop (resolved server-side from
 * the `gh_locale` cookie → `CF-IPCountry` → `Accept-Language`, see
 * `src/server/locale.ts`) and pull their copy from `dict(locale)`.
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
