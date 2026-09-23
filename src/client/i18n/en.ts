/**
 * English UI copy for the public site.
 *
 * `Dict` is derived from this object — `ar.ts` must mirror every key, so a
 * missing translation is a compile error, not a silent English leak.
 * Editorial content (decision summaries, testimony notes, reference titles)
 * does NOT live here: it comes from the database per locale.
 */
export const en = {
	langName: "English",
	nav: {
		aria: "Primary",
		menu: "Menu",
		close: "Close menu",
		today: "Today",
		calendar: "Calendar",
		contribute: "Contribute",
		methodology: "Methodology",
		sources: "Sources",
		docs: "API Docs",
	},
	header: {
		signIn: "Sign in",
		dashboard: "Dashboard",
		language: "Language",
	},
	footer: {
		tagline:
			"One valid crescent sighting anywhere starts the month for all. Testimony-based, never predicted.",
		site: "Site",
		developers: "Developers",
		todayDate: "Today's date",
		calendar: "Calendar",
		methodology: "Methodology",
		freeApi: "Free API",
		sources: "Sources",
		reportSighting: "Report a sighting",
	},
	status: {
		draft: "draft",
		provisional: "provisional",
		confirmed: "confirmed",
		corrected: "corrected",
		awaiting: "awaiting",
	} as Record<string, string>,
	result: {
		seen: "seen",
		not_seen: "not seen",
		cloudy: "cloudy",
	} as Record<string, string>,
	method: {
		naked_eye: "naked eye",
		telescope: "telescope",
		both: "both",
		unknown: "unknown",
	} as Record<string, string>,
	common: {
		nextWatching: "Next moon watching",
		monthDetail: "Month detail",
		readRuling: "Read the full ruling, testimonies and references",
		verified: "verified",
		witness: "Witness",
		by: "by",
		eveningOf: (date: string) => `Evening of ${date}`,
		days: (n: string) => `${n} days`,
		hijriYear: (y: string) => `${y} H`,
		notFoundTitle: "404 — page not found",
		notFoundBody: "The page you are looking for does not exist.",
		goHome: "Go home",
	},
	warnings: {
		provisional:
			"Awaiting confirmation; may change after further verification.",
		unknownTz: (tz: string) => `Unknown timezone “${tz}” — showing UTC instead.`,
	},
	home: {
		kicker: (date: string, day: string) => `${date} · day ${day} of the month`,
		evidence: "The evidence",
		sightedIn: (place: string) => `Sighted in ${place}`,
		sightedInNote: " — testimony received and verified.",
		nextWatchingNote:
			"On the 29th evening the ummah looks up. One valid sighting anywhere opens the new month for everyone.",
		apiCta:
			"Building a prayer timetable or a masjid display? Take the date from the free API —",
		apiCtaLink: "read the docs",
		empty:
			"No moon-sighting determinations published yet. Check back after the next observation evening.",
	},
	today: {
		kicker: "Today",
		h1: "What date is it in Hijri?",
		timezone: "Timezone",
		show: "Show",
		sightedIn: "Sighted in:",
		noCoverage:
			"No rukyat determination covers this date — future dates are never predicted.",
		explainer:
			"The month is the same for the whole ummah — your timezone only selects which Gregorian civil date you are asking about. A testimony arriving late from another continent can still make today the 1st.",
		titleFallback: "Today",
	},
	calendar: {
		kicker: "Archive",
		h1: "Hijri calendar",
		year: "Year",
		intro:
			"Every month below began with a witnessed crescent — or is still waiting for one. Nothing here is calculated in advance.",
		awaiting: "Awaiting rukyat — no testimony yet.",
		noData: "No determinations published yet.",
		title: (year: string) => `Hijri ${year} calendar`,
		titleFallback: "Hijri calendar",
	},
	month: {
		calendarCrumb: "Calendar",
		testimonies: "Testimonies",
		noTestimonies: "No testimony records published for this month.",
		references: "References",
		referencesPending: "References are being collected.",
		title: (month: string, year: string, start: string) =>
			`${month} ${year} started ${start}`,
	},
	methodology: {
		kicker: "Methodology",
		h1: "Five rules decide every date on this site.",
		intro:
			"Applied the same way every month, with no exceptions for any country. If a date here surprises you, these rules explain why.",
		archiveLead: "See any ",
		archiveLink: "month in the archive",
		archiveTail: ". Corrections append history; they never rewrite it.",
		title: "Methodology",
		rules: [
			{
				n: "01",
				title: "A month begins with testimony",
				body:
					"Following the hadith of the Messenger of Allah ﷺ — fast when you see it, break fast when you see it — a new month is declared when there is credible testimony that the crescent was seen. Without valid testimony, the month completes thirty days.",
			},
			{
				n: "02",
				title: "One sighting counts for the whole world",
				body:
					"A single global horizon: one valid sighting anywhere on Earth starts the month for all Muslims. We are not bound to any single country — Saudi Arabia is one source among equals, and a village committee's testimony can carry the ummah.",
			},
			{
				n: "03",
				title: "Testimony only — never forecasts",
				body:
					"We publish no predicted months. The only forward-looking date is the next observation evening, the 29th night. Ask for any date beyond confirmed testimony and the API answers: out of range.",
			},
			{
				n: "04",
				title: "No day boundary",
				body:
					"A late testimony still counts for the same day. If Indonesia is past sunrise when a valid sighting arrives from a continent whose night falls later, that day is the 1st — revised on the same Gregorian date. Rulings can move from provisional to confirmed intraday.",
			},
			{
				n: "05",
				title: "Evidence stays public",
				body:
					"Every month page names its witnesses and links the rulings behind it.",
			},
		],
	},
	sources: {
		kicker: "Sources",
		h1: "Every ruling links to what actually happened.",
		intro:
			"Each month we look for what truly occurred: official announcements, state news agencies, ministries of religious affairs, and hilal committees — in any country. Aggregators and blogs are supplementary only, never the sole basis.",
		accept: "We accept",
		items: [
			"Moon-sighting committee announcements with named witnesses",
			"State news agencies reporting an official decision",
			"Ministries of religious affairs (Indonesia, Malaysia, Brunei, Morocco, Jordan, …)",
			"Recognised hilal committees publishing their testimony",
		],
		check: "How to check us",
		checkBody1:
			"Each reference lists its publisher, publication date and the exact quoted sentence. Dead links are replaced with an archived copy.",
		checkBody2Lead: "Saw the crescent yourself? ",
		checkBody2Link: "Send your testimony",
		checkBody2Tail:
			" — editors verify every report, and corrections are published, never silently edited.",
		title: "Sources",
	},
	docs: {
		kicker: "Developers",
		h1: "One endpoint answers “what Hijri date is it?”",
		intro:
			"Free JSON API, no key, CORS open for GET. Base URL",
		published: (n: string) =>
			`${n} month${n === "1" ? "" : "s"} published — and counting by testimony, never by forecast.`,
		endpoints: [
			{
				method: "GET /today",
				desc: "Today's Hijri date. Query tz (IANA, default UTC) and date (YYYY-MM-DD, for testing).",
				curl: 'curl "https://globalhilal.org/api/v1/today?tz=Asia/Jakarta"',
			},
			{
				method: "GET /convert",
				desc: "Hijri date for any Gregorian date: ?gregorian=YYYY-MM-DD&tz=…",
				curl: 'curl "https://globalhilal.org/api/v1/convert?gregorian=2026-03-20"',
			},
			{
				method: "GET /months",
				desc: "History, newest first. Query hijri_year, status, perPage, page.",
				curl: 'curl "https://globalhilal.org/api/v1/months?hijri_year=1447"',
			},
			{
				method: "GET /months/current · /months/:year/:month",
				desc: "The running month, or full detail with testimonies and references.",
				curl: 'curl "https://globalhilal.org/api/v1/months/1447/9"',
			},
		],
		errorsLead: "Errors are",
		errorsEnvelope: "{ error: { code, message } }",
		errorsCodes: "— INVALID_TZ, INVALID_DATE, NOT_FOUND, OUT_OF_RANGE.",
		errorsTail:
			"Dates beyond confirmed testimony return OUT_OF_RANGE: the API will not guess the future. Breaking changes ship as /v2; /v1 stays for at least 12 months.",
		title: "API Docs",
	},
	contribute: {
		kicker: "Contribute",
		h1: "Saw the crescent? Tell the ummah.",
		intro:
			"One valid testimony anywhere opens the month for everyone — yours could be the one. Editors verify every report before it counts, and needless details stay private. One report per person per day.",
		success:
			"Jazakum Allahu khayran — your report was received and is awaiting editor review.",
		month: "Month observed",
		evening: "Evening observed",
		country: "Country",
		city: "City (optional)",
		result: "Result",
		method: "Method",
		name: "Your name",
		contact: "Contact for follow-up (optional)",
		contactPlaceholder: "Email or phone",
		note: "What did you see?",
		notePlaceholder: "Time after sunset, sky conditions, witnesses with you…",
		submit: "Submit testimony",
		sending: "Sending…",
		readMethodologyLead: "Read ",
		readMethodologyLink: "how rulings are made",
		readMethodologyTail: " before reporting.",
		resultOptions: {
			seen: "Crescent seen",
			not_seen: "Looked, not seen",
			cloudy: "Cloudy — could not observe",
		} as Record<string, string>,
		methodOptions: {
			naked_eye: "Naked eye",
			telescope: "Telescope / binoculars",
			both: "Both",
			unknown: "Unknown",
		} as Record<string, string>,
		title: "Report a moon sighting",
	},
	meta: {
		homeDescription:
			"Today's Hijri date by global moon-sighting testimony. One valid sighting anywhere starts the month for all.",
		todayDescription:
			"Today's Hijri date by global moon-sighting testimony, in your timezone.",
		calendarDescription:
			"Hijri months by global moon-sighting testimony, with start dates, lengths and decision references.",
		methodologyDescription:
			"How GlobalHilal sets Hijri months: testimony-based global moon-sighting. One valid sighting anywhere starts the month for all.",
		sourcesDescription:
			"Where GlobalHilal rulings come from: official announcements, state news agencies, ministries and hilal committees worldwide.",
		docsDescription:
			"Free public JSON API for testimony-based Hijri dates. No auth, CORS open, versioned at /api/v1.",
		contributeDescription:
			"Saw the crescent? Send your moon-sighting testimony to GlobalHilal. Editors verify every report before it counts.",
	},
};

export type Dict = typeof en;
