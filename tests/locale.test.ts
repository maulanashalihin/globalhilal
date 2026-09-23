/**
 * Locale resolution (pure functions, no app boot) + display formatting.
 * Locales live in the URL path (/en/…, /ar/…); prefix-less public URLs
 * redirect by geography. Run with: bun test --isolate.
 */
import { describe, expect, it } from "bun:test";
import { fmtDate, fmtNum, toArabicDigits } from "../src/client/i18n/format";
import { cityName, placeLabel, placeName } from "../src/client/i18n/places";
import {
	geoLocale,
	isLocale,
	isRtl,
	localeFromPath,
	stripLocalePrefix,
	withLocalePrefix,
} from "../src/server/locale";

describe("localeFromPath", () => {
	it("reads the locale from the /en and /ar prefixes", () => {
		expect(localeFromPath("/en/")).toBe("en");
		expect(localeFromPath("/en/today?tz=UTC")).toBe("en");
		expect(localeFromPath("/ar/hijri/1448-04")).toBe("ar");
		expect(localeFromPath("/ar")).toBe("ar");
	});

	it("returns null for prefix-less and unknown paths", () => {
		for (const p of ["/", "/today", "/login", "/dashboard", "/api/v1/today", "/fr/today", "/english"]) {
			expect(localeFromPath(p)).toBeNull();
		}
	});
});

describe("stripLocalePrefix / withLocalePrefix", () => {
	it("strips a leading locale prefix", () => {
		expect(stripLocalePrefix("/ar/today")).toBe("/today");
		expect(stripLocalePrefix("/en/")).toBe("/");
		expect(stripLocalePrefix("/en")).toBe("/");
		expect(stripLocalePrefix("/today")).toBe("/today");
		expect(stripLocalePrefix("/")).toBe("/");
	});

	it("prefixes root-absolute paths", () => {
		expect(withLocalePrefix("ar", "/today")).toBe("/ar/today");
		expect(withLocalePrefix("en", "/")).toBe("/en");
		expect(withLocalePrefix("ar", "/hijri/1448-04")).toBe("/ar/hijri/1448-04");
	});
});

describe("geoLocale", () => {
	it("redirects Arab-League states to Arabic", () => {
		for (const country of ["SA", "ae", " EG ", "QA", "MA", "YE"]) {
			expect(geoLocale({ country })).toBe("ar");
		}
	});

	it("treats non-Arab / unknown / Tor countries as English", () => {
		for (const country of ["ID", "US", "GB", "XX", "T1", "", null, undefined]) {
			expect(geoLocale({ country })).toBe("en");
		}
	});

	it("uses Accept-Language when geo is silent or non-Arab", () => {
		expect(geoLocale({ acceptLanguage: "ar-EG,ar;q=0.9,en;q=0.8" })).toBe("ar");
		expect(geoLocale({ acceptLanguage: "ar;q=0" })).toBe("en");
		expect(geoLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
		expect(geoLocale({})).toBe("en");
		// A non-Arab country does not force English — the browser language
		// still decides (dev/curl without the CF header).
		expect(geoLocale({ country: "ID", acceptLanguage: "ar" })).toBe("ar");
		// An Arab country wins over an English browser language.
		expect(geoLocale({ country: "SA", acceptLanguage: "en" })).toBe("ar");
	});

	it("narrows locale literals", () => {
		expect(isLocale("ar")).toBe(true);
		expect(isLocale("en")).toBe(true);
		expect(isLocale("AR")).toBe(false);
		expect(isRtl("ar")).toBe(true);
		expect(isRtl("en")).toBe(false);
	});
});

describe("digit formatting", () => {
	it("converts Western digits to Arabic-Indic", () => {
		expect(toArabicDigits("1448-09-21")).toBe("١٤٤٨-٠٩-٢١");
		expect(toArabicDigits(28)).toBe("٢٨");
	});

	it("applies Arabic digits only for the ar locale", () => {
		expect(fmtNum("29", "ar")).toBe("٢٩");
		expect(fmtNum("29", "en")).toBe("29");
		expect(fmtDate("2026-09-22", "ar")).toBe("٢٠٢٦-٠٩-٢٢");
		expect(fmtDate("2026-09-22", "en")).toBe("2026-09-22");
	});
});

describe("place localization", () => {
	it("maps known countries and cities for Arabic", () => {
		expect(placeName("Saudi Arabia", "ar")).toBe("السعودية");
		expect(placeName("saudi arabia", "ar")).toBe("السعودية");
		expect(placeName("Saudi Arabia", "en")).toBe("Saudi Arabia");
		expect(cityName("Tumair", "ar")).toBe("تمير");
		expect(placeLabel("Saudi Arabia (Tumair)", "ar")).toBe("السعودية (تمير)");
	});

	it("falls back to the stored text for unknown places", () => {
		expect(placeName("Atlantis", "ar")).toBe("Atlantis");
		expect(cityName("Nowhere", "ar")).toBe("Nowhere");
		expect(placeLabel("Atlantis (Nowhere)", "ar")).toBe("Atlantis (Nowhere)");
		expect(placeLabel("Indonesia", "ar")).toBe("إندونيسيا");
		expect(placeName(null, "ar")).toBeNull();
	});
});
