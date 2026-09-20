/**
 * Types shared between the Elysia server and the Inertia React client.
 * Keep this file free of runtime imports — it must be importable from
 * both `src/server` (Bun runtime) and `src/client` (browser bundle).
 */

export type Role = "user" | "admin";

export interface User {
	id: number;
	name: string;
	email: string;
	role: Role;
	/** Relative path to the avatar image (served from /uploads), null when unset. */
	avatarUrl: string | null;
	/** Whether the user has verified their email address. */
	emailVerified: boolean;
	createdAt: string;
}

/** One-shot session flash messages, persisted in the `sessions` table. */
export interface FlashData {
	success?: string;
	error?: string;
	/** Validation errors for the redirect-back (non-Inertia) flow. */
	errors?: Record<string, string>;
}

/** Props the server merges into every Inertia page response. */
export interface SharedPageProps {
	[key: string]: unknown;
	auth: { user: User | null };
	errors: Record<string, string>;
}

/** Props for the dashboard page. */
export interface DashboardStats {
	userCount: number;
	recentUsers: User[];
	/** Hijri editorial overview (UTC). */
	today: TodayData | null;
	monthCount: number;
	draftCount: number;
	provisionalCount: number;
	monthsMissingReferences: { month_key: string; month_en: string }[];
	recentMonths: { month_key: string; month_en: string; start_gregorian: string | null; status: string }[];
}

/** Generic pagination envelope, mirroring what the server returns. */
export interface Paginated<T> {
	data: T[];
	meta: {
		currentPage: number;
		perPage: number;
		lastPage: number;
		total: number;
	};
}

/** Hijri month status lifecycle. */
export type HijriStatus = "draft" | "provisional" | "confirmed" | "corrected";

/** One Hijri month determination (GlobalHilal, testimony-based, global). */
export interface HijriMonth {
	id: number;
	hijriYear: number;
	hijriMonth: number; // 1-12
	monthKey: string; // '1447-09' (zero-padded, canonical)
	monthEn: string;
	monthAr: string;
	startGregorian: string; // 'YYYY-MM-DD' (UTC date of first valid testimony)
	endGregorian: string | null;
	lengthDays: 29 | 30 | null;
	status: HijriStatus;
	decisionSummaryEn: string;
	publishedAt: string | null;
	updatedAt: string;
}

export type SightingResult = "seen" | "not_seen" | "cloudy";
export type SightingMethod = "naked_eye" | "telescope" | "both" | "unknown";

/** One testimony/sighting report backing a month determination. */
export interface SightingReport {
	id: number;
	monthId: number;
	country: string;
	city: string | null;
	lat: number | null;
	lon: number | null;
	sightedOn: string; // 'YYYY-MM-DD'
	result: SightingResult;
	method: SightingMethod;
	witnessOrg: string | null;
	verified: boolean;
	noteEn: string;
}

export type ReferenceKind = "official" | "news" | "org" | "other";

/** One decision reference (ruling/announcement) behind a month. */
export interface MonthReference {
	id: number;
	monthId: number;
	titleEn: string;
	publisher: string;
	url: string;
	publishedAt: string | null;
	quoteEn: string;
	kind: ReferenceKind;
}

/**
 * Public JSON contract (snake_case) shared by /api/v1/* and Inertia pages.
 * Serializers live in `src/server/hijri.ts`; Svelte pages consume these
 * shapes without importing server modules (which would pull bun:sqlite
 * into the browser bundle).
 */

export interface TodayData {
	gregorian: { date: string; timezone: string };
	hijri: {
		year: number;
		month: number;
		month_key: string;
		month_en: string;
		month_ar: string;
		day: number;
	};
	determination: {
		status: string;
		month_started_on: string;
		month_length: 29 | 30 | null;
		sighted_in: string[];
		decision_summary: string;
		references_url: string;
	};
	warning?: string;
	next_observation_date: string;
	notes: string;
}

export interface MonthDetailJson {
	month: {
		hijri_year: number;
		hijri_month: number;
		month_key: string;
		month_en: string;
		month_ar: string;
		start_gregorian: string;
		end_gregorian: string | null;
		length_days: 29 | 30 | null;
		status: string;
		decision_summary: string;
		published_at: string | null;
	};
	sightings: {
		country: string;
		city: string | null;
		lat: number | null;
		lon: number | null;
		sighted_on: string;
		result: string;
		method: string;
		witness_org: string | null;
		verified: boolean;
		note: string;
	}[];
	references: {
		title: string;
		publisher: string;
		url: string;
		published_at: string | null;
		quote: string;
		kind: string;
	}[];
	sighted_in: string[];
	next_observation_date: string;
}

export interface CalendarMonthSlot {
	hijri_year: number | null;
	hijri_month: number;
	month_key: string | null;
	month_en: string;
	month_ar: string;
	start_gregorian: string | null;
	end_gregorian: string | null;
	length_days: 29 | 30 | null;
	status: string; // HijriStatus | "awaiting"
	sighted_in: string[];
}
