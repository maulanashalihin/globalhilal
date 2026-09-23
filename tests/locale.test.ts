/**
 * Locale resolution + display formatting (pure functions, no app boot).
 * Run with: bun test --isolate.
 */
import { describe, expect, it } from "bun:test";
import { fmtDate, fmtNum, toArabicDigits } from "../src/client/i18n/format";
import { cityName, placeLabel, placeName } from "../src/client/i18n/places";
import { isLocale, isRtl, resolveLocale } from "../src/server/locale";

describe("resolveLocale", () => {
	it("prefers the explicit cookie over geo", () => {
		expect(resolveLocale({ cookie: "en", country: "SA" })).toBe("en");
		expect(resolveLocale({ cookie: "ar", country: "ID" })).toBe("ar");
	});

	it("falls back to CF-IPCountry for Arab-League states", () => {
		for (const country of ["SA", "ae", " EG ", "QA", "MA", "YE"]) {
			expect(resolveLocale({ country })).toBe("ar");
		}
	});

	it("treats non-Arab / unknown / Tor countries as English", () => {
		for (const country of ["ID", "US", "GB", "XX", "T1", "", null, undefined]) {
			expect(resolveLocale({ country })).toBe("en");
		}
	});

	it("uses Accept-Language when geo is silent or non-Arab", () => {
		expect(resolveLocale({ acceptLanguage: "ar-EG,ar;q=0.9,en;q=0.8" })).toBe("ar");
		expect(resolveLocale({ acceptLanguage: "ar;q=0" })).toBe("en");
		expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
		expect(resolveLocale({})).toBe("en");
		// A non-Arab country does not force English — the browser language
		// still decides (dev/curl without the CF header).
		expect(resolveLocale({ country: "ID", acceptLanguage: "ar" })).toBe("ar");
		// An Arab country wins over an English browser language.
		expect(resolveLocale({ country: "SA", acceptLanguage: "en" })).toBe("ar");
	});

	it("ignores malformed cookie values", () => {
		expect(resolveLocale({ cookie: "fr", country: "EG" })).toBe("ar");
		// Cookie values are case-insensitive.
		expect(resolveLocale({ cookie: "AR" })).toBe("ar");
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
