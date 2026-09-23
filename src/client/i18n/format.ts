/**
 * Display formatting for the public site.
 *
 * Arabic-Indic digits are a *display* concern only: inputs, form values,
 * month keys, URLs and API/code samples always stay in Western digits.
 * Pure and SSR-safe — no Intl, so server and client always agree.
 */
import type { Locale } from "../../shared/types";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Western digits → Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩). */
export function toArabicDigits(value: string | number): string {
	return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)] ?? d);
}

/** Format a number for display in the given locale. */
export function fmtNum(value: string | number, locale: Locale): string {
	return locale === "ar" ? toArabicDigits(value) : String(value);
}

/** Format an ISO 'YYYY-MM-DD' date for display in the given locale. */
export function fmtDate(iso: string, locale: Locale): string {
	return fmtNum(iso, locale);
}
