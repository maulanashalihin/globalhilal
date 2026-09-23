/**
 * `bun run db:seed-ar` — backfill Arabic translations for the 1448H archive.
 *
 * Editorial content lives in the database (README "Localization"): months,
 * testimonies and references carry optional `_ar` columns (migration 0010).
 * This script fills them for rows seeded before the bilingual schema existed.
 *
 * - Idempotent: rows are matched by stable keys (month_key; month + country +
 *   sighting date; month + reference URL), so re-running refreshes the same
 *   rows instead of duplicating anything.
 * - Never creates content: anything that cannot be matched is reported as
 *   skipped. New months are translated in the admin console (/admin/hijri).
 * - English text is the source of truth; translations must stay faithful to
 *   it (they were reviewed against the English summary/quote of each row).
 */
import {
	db,
	findHijriMonthByKey,
	listReferencesByMonth,
	listSightingsByMonth,
	updateMonthSummaryAr,
	updateReferenceTranslation,
	updateSightingNoteAr,
} from "../src/server/db";

/** month_key → Arabic decision summary. */
const MONTHS: Record<string, string> = {
	"1448-01":
		"أكّد قرار المحكمة العليا السعودية رقم 208/هـ رؤية هلال محرم في مساء الاثنين 15 يونيو 2026؛ وبدأ غرة محرم 1448 عالميًا يوم الثلاثاء 16 يونيو 2026.",
	"1448-02":
		"قررت لجنة رؤية الهلال السعودية، بناءً على البلاغات الواردة في 14 يوليو 2026، أن الأربعاء 15 يوليو هو غرة صفر؛ وأفادت اللجان في أمريكا الشمالية بعدم ثبوت رؤية تلك الليلة فبدأت بعد يوم، وهو خلاف مسجَّل هنا.",
	"1448-03":
		"أعلنت السعودية أن الجمعة 14 أغسطس 2026 هو غرة ربيع الأول استنادًا إلى رؤية ليلة 13 أغسطس؛ وأفادت جمعية الهلال الجديد في المملكة المتحدة بعدم رؤية الهلال فبدأت في 15 أغسطس، وهو خلاف مسجَّل هنا.",
	"1448-04":
		"لم ترد أي شهادة موثَّقة برؤية الهلال من أي مكان في مساء الجمعة 11 سبتمبر 2026، فأُكمل ربيع الأول ثلاثين يومًا وبدأ ربيع الثاني عالميًا يوم الأحد 13 سبتمبر 2026 (الإمارات، إندونيسيا، أمريكا الشمالية). وتعرض التقاويم المدنية السعودية 12 سبتمبر وفق جدول أم القرى الحسابي.",
};

interface SightingTranslation {
	monthKey: string;
	country: string;
	sightedOn: string;
	noteAr: string;
}

/** Testimony notes, keyed by month + country + observation evening. */
const SIGHTINGS: SightingTranslation[] = [
	{
		monthKey: "1448-01",
		country: "Saudi Arabia",
		sightedOn: "2026-06-15",
		noteAr:
			"القرار 208/هـ المؤرخ 29/12/1447هـ: ثبوت الرؤية بناءً على البلاغات الواردة من المحاكم في أنحاء المملكة.",
	},
	{
		monthKey: "1448-02",
		country: "Saudi Arabia",
		sightedOn: "2026-07-14",
		noteAr:
			"راجعت اللجنة بلاغات الرؤية الواردة من المحاكم؛ وأُعلن غرة صفر 1448 يوم الأربعاء 15 يوليو 2026.",
	},
	{
		monthKey: "1448-02",
		country: "United States",
		sightedOn: "2026-07-14",
		noteAr:
			"لم تُبلَّغ أي رؤية موثَّقة بالعين المجردة؛ فبدأت اللجان صفر في 16 يوليو. ويُسجَّل ذلك كخلاف: فالشهادة الصحيحة الواحدة في أي مكان تكفي عالميًا.",
	},
	{
		monthKey: "1448-03",
		country: "Saudi Arabia",
		sightedOn: "2026-08-13",
		noteAr: "إعلان رسمي: الجمعة 14 أغسطس 2026 هو غرة ربيع الأول 1448.",
	},
	{
		monthKey: "1448-03",
		country: "United Kingdom",
		sightedOn: "2026-08-13",
		noteAr:
			"لم يُرَ هلال ربيع الأول في الجزر البريطانية؛ والبداية المحلية 15 أغسطس. ويُسجَّل ذلك كخلاف.",
	},
	{
		monthKey: "1448-04",
		country: "United States",
		sightedOn: "2026-09-11",
		noteAr: "أكدت البلاغات من جميع اللجان الفرعية بالإجماع عدم رؤية الهلال.",
	},
	{
		monthKey: "1448-04",
		country: "Indonesia",
		sightedOn: "2026-09-11",
		noteAr:
			"لم يُرَ الهلال في ليلة 29 من ربيع الأول؛ وحُدِّد غرة ربيع الثاني يوم الأحد 13 سبتمبر 2026.",
	},
	{
		monthKey: "1448-04",
		country: "United Kingdom",
		sightedOn: "2026-09-11",
		noteAr: "لم يُرَ هلال ربيع الثاني في الجزر البريطانية.",
	},
];

interface ReferenceTranslation {
	monthKey: string;
	url: string;
	titleAr: string;
	quoteAr: string;
}

/** Reference titles + quotes, keyed by month + URL. */
const REFERENCES: ReferenceTranslation[] = [
	{
		monthKey: "1448-01",
		url: "https://www.moroccoworldnews.com/2026/06/320195/saudi-arabia-confirms-muharram-moon-sighting-hijri-year-1448-starts-tuesday",
		titleAr: "السعودية تؤكد رؤية هلال محرم وبدء السنة الهجرية 1448 يوم الثلاثاء",
		quoteAr: "ثبتت رؤية هلال شهر محرم لعام 1448 هـ في مساء يوم الاثنين.",
	},
	{
		monthKey: "1448-01",
		url: "https://www.arabianbusiness.com/abnews/saudi-arabia-islamic-new-year-1448",
		titleAr: "السعودية تؤكد موعد رأس السنة الهجرية: غرة محرم 1448 تبدأ في 16 يونيو",
		quoteAr: "سيكون الثلاثاء 16 يونيو 2026 هو اليوم الأول من محرم 1448 هـ.",
	},
	{
		monthKey: "1448-02",
		url: "https://www.moj.gov.sa/English/MediaCenter/news/Pages/SupremeCourtNewsDetails.aspx?itemId=83",
		titleAr: "قرار لجنة رؤية الهلال بشأن شهر صفر 1448 هـ",
		quoteAr:
			"راجعت لجنة رؤية الهلال في المحكمة العليا البلاغات الواردة من المحاكم بشأن رؤية هلال صفر 1448.",
	},
	{
		monthKey: "1448-02",
		url: "https://imam-us.org/the-crescent-moon-of-the-month-of-safar-1448-a-h",
		titleAr: "هلال شهر صفر 1448 هـ",
		quoteAr: "لا توجد رؤية موثَّقة للهلال بالعين المجردة عند غروب شمس الثلاثاء 14 يوليو.",
	},
	{
		monthKey: "1448-03",
		url: "https://imam-us.org/the-crescent-moon-of-the-month-of-rabi-al-awwal-1448-a-h",
		titleAr: "هلال شهر ربيع الأول 1448 هـ",
		quoteAr:
			"يبدأ ربيع الأول 1448 يوم الجمعة 14 أغسطس 2026 لجميع المناطق الواقعة على خط الرؤية أو جنوبه.",
	},
	{
		monthKey: "1448-03",
		url: "https://hilalcommittee.org/news/rabi-al-awwal-1448-ah-alert",
		titleAr: "تنبيه بخصوص ربيع الأول 1448 هـ",
		quoteAr:
			"نرجو بذل الجهد لتحرّي الهلال يوم الخميس 13 أغسطس 2026 لشهر ربيع الأول 1448.",
	},
	{
		monthKey: "1448-03",
		url: "https://x.com/NewCrescentSoc/status/2088010385685352668",
		titleAr: "لم يُرَ هلال ربيع الأول",
		quoteAr: "لم يُرَ هلال ربيع الأول؛ وغرة ربيع الأول 1448 هـ = السبت 15 أغسطس 2026.",
	},
	{
		monthKey: "1448-04",
		url: "https://www.facebook.com/FaithNotes47/posts/the-uae-council-for-fatwa-has-officially-announced-that-sunday-september-13-2026/122216499422520520",
		titleAr: "الإمارات تؤكد أن ربيع الثاني 1448 يبدأ يوم الأحد 13 سبتمبر 2026",
		quoteAr: "سيكون الأحد 13 سبتمبر 2026 هو اليوم الأول من ربيع الثاني 1448 هـ.",
	},
	{
		monthKey: "1448-04",
		url: "https://banten.nu.or.id/nasional/awal-rabiul-akhir-1448-h-jatuh-pada-ahad-pon-13-september-2026-4loLH",
		titleAr: "بداية ربيع الآخر 1448 هـ توافق الأحد 13 سبتمبر 2026",
		quoteAr: "بداية ربيع الآخر 1448 هـ توافق الأحد 13 سبتمبر 2026.",
	},
	{
		monthKey: "1448-04",
		url: "https://hilalcommittee.org/news/rabi-al-thani-1448-ah",
		titleAr: "ربيع الثاني 1448 هـ",
		quoteAr: "أكدت البلاغات من جميع اللجان الفرعية بالإجماع عدم رؤية الهلال.",
	},
];

let updated = 0;
const skipped: string[] = [];

for (const [key, summaryAr] of Object.entries(MONTHS)) {
	const row = findHijriMonthByKey.get(key);
	if (!row) {
		skipped.push(`month ${key}`);
		continue;
	}
	updateMonthSummaryAr.get(summaryAr, key);
	updated++;
}

for (const item of SIGHTINGS) {
	const month = findHijriMonthByKey.get(item.monthKey);
	const sighting = month
		? listSightingsByMonth
				.all(month.id)
				.find((s) => s.country === item.country && s.sightedOn === item.sightedOn)
		: undefined;
	if (!sighting) {
		skipped.push(`sighting ${item.monthKey} ${item.country} ${item.sightedOn}`);
		continue;
	}
	updateSightingNoteAr.get(item.noteAr, sighting.id);
	updated++;
}

for (const item of REFERENCES) {
	const month = findHijriMonthByKey.get(item.monthKey);
	const reference = month
		? listReferencesByMonth.all(month.id).find((r) => r.url === item.url)
		: undefined;
	if (!reference) {
		skipped.push(`reference ${item.monthKey} ${item.url}`);
		continue;
	}
	updateReferenceTranslation.get(item.titleAr, item.quoteAr, reference.id);
	updated++;
}

console.log(`Arabic content: ${updated} rows updated.`);
if (skipped.length > 0) {
	console.log(`${skipped.length} rows skipped (not found — nothing was created):`);
	for (const s of skipped) console.log(`  - ${s}`);
}
db.close();
