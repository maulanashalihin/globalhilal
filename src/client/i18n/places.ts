/**
 * Display-only localization for place names in sighting reports.
 *
 * `country`/`city` are free text in the database (proper nouns, no `_ar`
 * column by design), so Arabic pages translate them at render time. Unknown
 * names fall back to the stored text — never blank, never invented.
 * Editors can keep entering English names; add a mapping here when a new
 * place shows up regularly.
 */
import type { Locale } from "../../shared/types";

const COUNTRY_AR: Record<string, string> = {
	"saudi arabia": "السعودية",
	"united arab emirates": "الإمارات العربية المتحدة",
	uae: "الإمارات",
	indonesia: "إندونيسيا",
	malaysia: "ماليزيا",
	brunei: "بروناي",
	"brunei darussalam": "بروناي دار السلام",
	morocco: "المغرب",
	jordan: "الأردن",
	egypt: "مصر",
	turkey: "تركيا",
	"türkiye": "تركيا",
	iran: "إيران",
	iraq: "العراق",
	pakistan: "باكستان",
	india: "الهند",
	bangladesh: "بنغلاديش",
	nigeria: "نيجيريا",
	"south africa": "جنوب أفريقيا",
	"united states": "الولايات المتحدة",
	usa: "الولايات المتحدة",
	canada: "كندا",
	"united kingdom": "المملكة المتحدة",
	uk: "المملكة المتحدة",
	france: "فرنسا",
	germany: "ألمانيا",
	netherlands: "هولندا",
	belgium: "بلجيكا",
	spain: "إسبانيا",
	italy: "إيطاليا",
	sweden: "السويد",
	norway: "النرويج",
	denmark: "الدنمارك",
	ireland: "أيرلندا",
	australia: "أستراليا",
	"new zealand": "نيوزيلندا",
	oman: "عُمان",
	qatar: "قطر",
	kuwait: "الكويت",
	bahrain: "البحرين",
	yemen: "اليمن",
	sudan: "السودان",
	algeria: "الجزائر",
	tunisia: "تونس",
	libya: "ليبيا",
	lebanon: "لبنان",
	syria: "سوريا",
	palestine: "فلسطين",
	somalia: "الصومال",
	djibouti: "جيبوتي",
	mauritania: "موريتانيا",
	senegal: "السنغال",
	mali: "مالي",
	niger: "النيجر",
	chad: "تشاد",
	japan: "اليابان",
	singapore: "سنغافورة",
	thailand: "تايلاند",
	russia: "روسيا",
	mexico: "المكسيك",
	brazil: "البرازيل",
	argentina: "الأرجنتين",
	chile: "تشيلي",
};

const CITY_AR: Record<string, string> = {
	tumair: "تمير",
	sukabumi: "سوكابومي",
	jakarta: "جاكرتا",
	mecca: "مكة المكرمة",
	makkah: "مكة المكرمة",
	medina: "المدينة المنورة",
	madinah: "المدينة المنورة",
	riyadh: "الرياض",
	cairo: "القاهرة",
	amman: "عمّان",
	rabat: "الرباط",
	"kuala lumpur": "كوالالمبور",
	bandung: "باندونغ",
	surabaya: "سورابايا",
	yogyakarta: "يوجياكرتا",
	london: "لندن",
	"new york": "نيويورك",
	chicago: "شيكاغو",
	toronto: "تورونتو",
	dubai: "دبي",
	doha: "الدوحة",
	manama: "المنامة",
	muscat: "مسقط",
	sanaa: "صنعاء",
	khartoum: "الخرطوم",
};

function lookup(map: Record<string, string>, name: string): string {
	return map[name.trim().toLowerCase()] ?? name;
}

/** Localize a single place name ("Saudi Arabia" → "السعودية"). */
export function placeName(name: string | null, locale: Locale): string | null {
	if (name === null) return null;
	return locale === "ar" ? lookup(COUNTRY_AR, name) : name;
}

/** Localize a city name ("Tumair" → "تمير"). */
export function cityName(city: string | null, locale: Locale): string | null {
	if (city === null) return null;
	return locale === "ar" ? lookup(CITY_AR, city) : city;
}

/**
 * Localize a "Country (City)" label — the shape `sighted_in` uses
 * (e.g. "Saudi Arabia (Tumair)" → "السعودية (تمير)"). Unknown names pass
 * through unchanged.
 */
export function placeLabel(label: string, locale: Locale): string {
	if (locale !== "ar") return label;
	const match = /^(.*?)\s*\((.*)\)$/.exec(label.trim());
	if (!match) return lookup(COUNTRY_AR, label);
	const [, country = "", city = ""] = match;
	return `${lookup(COUNTRY_AR, country)} (${lookup(CITY_AR, city)})`;
}
