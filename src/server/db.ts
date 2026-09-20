/**
 * bun:sqlite layer — synchronous, zero-ORM.
 * Schema comes from migrations/ (see migrations.ts); statements are
 * prepared once, after migrations are applied.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Role } from "../shared/types";
import { config } from "./config";
import { migrate } from "./migrations";

export interface UserRow {
	id: number;
	name: string;
	email: string;
	passwordHash: string;
	role: Role;
	googleId: string | null;
	avatarUrl: string | null;
	emailVerified: number; // 0 or 1 (SQLite boolean)
	createdAt: string;
}

export interface SessionRow {
	tokenHash: string;
	userId: number;
	flash: string;
	expiresAt: string;
	createdAt: string;
}

export interface PasswordResetRow {
	email: string;
	tokenHash: string;
	expiresAt: string;
}

/** The user shape that may leave the server (never includes passwordHash). */
export type PublicUser = Omit<UserRow, "passwordHash" | "googleId" | "emailVerified"> & { emailVerified: boolean };

export const toPublicUser = (row: UserRow): PublicUser => ({
	id: row.id,
	name: row.name,
	email: row.email,
	role: row.role,
	avatarUrl: row.avatarUrl,
	emailVerified: row.emailVerified === 1,
	createdAt: row.createdAt,
});
if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath, { create: true });
db.exec("PRAGMA journal_mode = WAL");
// WAL + synchronous=NORMAL: skip fsync per commit — measured ~27× faster
// writes (3.5K → 95K/s on M4 NVMe, ~48× on HDD VPS). Tradeoff: on power
// loss the last transactions in WAL may be lost (DB stays consistent).
// Use FULL for zero-loss requirements (e.g. financial transactions).
db.exec("PRAGMA synchronous = NORMAL");
// Concurrent writes (e.g. two tus PATCHes) wait up to 5s instead of
// failing with SQLITE_BUSY.
db.exec("PRAGMA busy_timeout = 5000");
db.exec("PRAGMA foreign_keys = ON");

// Apply pending migrations before any statement is prepared/used.
migrate(db);

/** Cheap liveness probe for the /health endpoint. */
export const pingDb = db.query<{ n: number }, []>(`SELECT 1 AS n`);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const createUser = db.query<{ id: number }, [string, string, string]>(
	`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id`,
);
export const createUserWithRole = db.query<
	{ id: number },
	[string, string, string, Role]
>(
	`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id`,
);
export const createGoogleUser = db.query<
	{ id: number },
	[string, string, string, string]
>(
	`INSERT INTO users (name, email, password_hash, google_id, avatar_url) VALUES (?, ?, '', ?, ?) RETURNING id`,
);
export const findUserByEmail = db.query<UserRow, [string]>(
	`SELECT id, name, email, password_hash AS passwordHash, role, google_id AS googleId, avatar_url AS avatarUrl, email_verified AS emailVerified, created_at AS createdAt FROM users WHERE email = ?`,
);
export const findUserById = db.query<UserRow, [number]>(
	`SELECT id, name, email, password_hash AS passwordHash, role, google_id AS googleId, avatar_url AS avatarUrl, email_verified AS emailVerified, created_at AS createdAt FROM users WHERE id = ?`,
);
export const findUserByGoogleId = db.query<UserRow, [string]>(
	`SELECT id, name, email, password_hash AS passwordHash, role, google_id AS googleId, avatar_url AS avatarUrl, email_verified AS emailVerified, created_at AS createdAt FROM users WHERE google_id = ?`,
);
export const linkGoogleAccount = db.query<null, [string, number]>(
	`UPDATE users SET google_id = ? WHERE id = ?`,
);
export const updateUserPassword = db.query<null, [string, number]>(
	`UPDATE users SET password_hash = ? WHERE id = ?`,
);
export const updateUserAvatar = db.query<null, [string, number]>(
	`UPDATE users SET avatar_url = ? WHERE id = ?`,
);
export const updateUserProfile = db.query<null, [string, string, number]>(
	`UPDATE users SET name = ?, email = ? WHERE id = ?`,
);
export const countUsers = db.query<{ n: number }, []>(
	`SELECT COUNT(*) AS n FROM users`,
);
export const listUsers = db.query<UserRow, [number, number]>(
	`SELECT id, name, email, password_hash AS passwordHash, role, google_id AS googleId, avatar_url AS avatarUrl, email_verified AS emailVerified, created_at AS createdAt FROM users ORDER BY id DESC LIMIT ? OFFSET ?`,
);
export const recentUsers = db.query<UserRow, [number]>(
	`SELECT id, name, email, password_hash AS passwordHash, role, google_id AS googleId, avatar_url AS avatarUrl, email_verified AS emailVerified, created_at AS createdAt FROM users ORDER BY id DESC LIMIT ?`,
);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const insertSession = db.query<null, [string, number, string]>(
	`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
);
export const findSession = db.query<SessionRow, [string]>(
	`SELECT token_hash AS tokenHash, user_id AS userId, flash, expires_at AS expiresAt, created_at AS createdAt FROM sessions WHERE token_hash = ?`,
);
export const deleteSession = db.query<null, [string]>(
	`DELETE FROM sessions WHERE token_hash = ?`,
);
export const deleteOtherSessions = db.query<null, [number, string]>(
	`DELETE FROM sessions WHERE user_id = ? AND token_hash != ?`,
);
export const updateSessionFlash = db.query<null, [string, string]>(
	`UPDATE sessions SET flash = ? WHERE token_hash = ?`,
);

// ---------------------------------------------------------------------------
// Password resets
// ---------------------------------------------------------------------------

export const insertPasswordReset = db.query<null, [string, string, string]>(
	`INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)`,
);
export const findPasswordReset = db.query<PasswordResetRow, [string]>(
	`SELECT email, token_hash AS tokenHash, expires_at AS expiresAt FROM password_resets WHERE token_hash = ?`,
);
export const deletePasswordResetsByEmail = db.query<null, [string]>(
	`DELETE FROM password_resets WHERE email = ?`,
);

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export interface EmailVerificationRow {
	tokenHash: string;
	userId: number;
	expiresAt: string;
}

export const insertEmailVerification = db.query<
	null,
	[string, number, string]
>(
	`INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
);
export const findEmailVerification = db.query<EmailVerificationRow, [string]>(
	`SELECT token_hash AS tokenHash, user_id AS userId, expires_at AS expiresAt FROM email_verifications WHERE token_hash = ?`,
);
export const deleteEmailVerification = db.query<null, [string]>(
	`DELETE FROM email_verifications WHERE token_hash = ?`,
);
export const deleteUserEmailVerifications = db.query<null, [number]>(
	`DELETE FROM email_verifications WHERE user_id = ?`,
);
export const verifyUserEmail = db.query<null, [number]>(
	`UPDATE users SET email_verified = 1 WHERE id = ?`,
);
// ---------------------------------------------------------------------------
// Uploads (tus)
// ---------------------------------------------------------------------------

export interface UploadRow {
	id: string;
	uploadLength: number;
	offset: number;
	metadata: string;
	userId: number | null;
	path: string;
	createdAt: string;
	expiresAt: string | null;
}

export const insertUpload = db.query<
	null,
	[string, number, string, number | null, string, string | null]
>(
	`INSERT INTO uploads (id, upload_length, metadata, user_id, path, expires_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

export const findUpload = db.query<UploadRow, [string]>(
	`SELECT id, upload_length AS uploadLength, offset, metadata, user_id AS userId, path, created_at AS createdAt, expires_at AS expiresAt FROM uploads WHERE id = ?`,
);

/** Atomically advance the offset only if the current offset matches `expected`.
 *  Returns the number of rows updated (1 on success, 0 on conflict). */
export const advanceOffset = db.query<{ n: number }, [number, string, number]>(
	`UPDATE uploads SET offset = offset + ? WHERE id = ? AND offset = ? RETURNING 1 AS n`,
);

export const deleteUpload = db.query<null, [string]>(
	`DELETE FROM uploads WHERE id = ?`,
);

/** Uploads whose expiration has passed (used by the sweep job). Caller passes
 *  `now` (ISO) so tests can control time. */
export const listExpired = db.query<UploadRow, [string]>(
	`SELECT id, upload_length AS uploadLength, offset, metadata, user_id AS userId, path, created_at AS createdAt, expires_at AS expiresAt FROM uploads WHERE expires_at IS NOT NULL AND expires_at < ?`,
);

// ---------------------------------------------------------------------------
// Hijri months (GlobalHilal — testimony-based, global, no forecasts)
// ---------------------------------------------------------------------------

export interface HijriMonthRow {
	id: number;
	hijriYear: number;
	hijriMonth: number;
	monthKey: string;
	monthEn: string;
	monthAr: string;
	startGregorian: string;
	endGregorian: string | null;
	lengthDays: 29 | 30 | null;
	status: string;
	decisionSummaryEn: string;
	createdBy: number | null;
	publishedAt: string | null;
	updatedAt: string;
}

const HIJRI_MONTH_COLS = `id, hijri_year AS hijriYear, hijri_month AS hijriMonth, month_key AS monthKey, month_name_en AS monthEn, month_name_ar AS monthAr, start_gregorian AS startGregorian, end_gregorian AS endGregorian, length_days AS lengthDays, status, decision_summary_en AS decisionSummaryEn, created_by AS createdBy, published_at AS publishedAt, updated_at AS updatedAt`;

export const insertHijriMonth = db.query<
	{ id: number },
	[string, number, number, string, string, string, string | null, number | null, string, string, number | null, string | null]
>(
	`INSERT INTO hijri_months (month_key, hijri_year, hijri_month, month_name_en, month_name_ar, start_gregorian, end_gregorian, length_days, status, decision_summary_en, created_by, published_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);

export const findHijriMonthByKey = db.query<HijriMonthRow, [string]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE month_key = ?`,
);

export const listHijriMonthsAsc = db.query<HijriMonthRow, []>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months ORDER BY start_gregorian ASC, id ASC`,
);

export const listHijriMonthsDesc = db.query<HijriMonthRow, [number, number]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months ORDER BY start_gregorian DESC, id DESC LIMIT ? OFFSET ?`,
);

export const listHijriMonthsByYear = db.query<HijriMonthRow, [number]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE hijri_year = ? ORDER BY hijri_month ASC`,
);

export const countHijriMonths = db.query<{ n: number }, []>(
	`SELECT COUNT(*) AS n FROM hijri_months`,
);

export const updateHijriMonth = db.query<
	null,
	[string, string | null, number | null, string, string, number]
>(
	`UPDATE hijri_months SET start_gregorian = ?, end_gregorian = ?, length_days = ?, status = ?, decision_summary_en = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
);

export interface SightingReportRow {
	id: number;
	monthId: number;
	country: string;
	city: string | null;
	lat: number | null;
	lon: number | null;
	sightedOn: string;
	result: string;
	method: string;
	witnessOrg: string | null;
	verified: number;
	noteEn: string;
}

const SIGHTING_COLS = `id, month_id AS monthId, country, city, lat, lon, sighted_on AS sightedOn, result, method, witness_org AS witnessOrg, verified, note_en AS noteEn`;

export const insertSightingReport = db.query<
	{ id: number },
	[number, string, string | null, number | null, number | null, string, string, string, string | null, number, string]
>(
	`INSERT INTO sighting_reports (month_id, country, city, lat, lon, sighted_on, result, method, witness_org, verified, note_en)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);

export const listSightingsByMonth = db.query<SightingReportRow, [number]>(
	`SELECT ${SIGHTING_COLS} FROM sighting_reports WHERE month_id = ? ORDER BY id ASC`,
);

export interface MonthReferenceRow {
	id: number;
	monthId: number;
	titleEn: string;
	publisher: string;
	url: string;
	publishedAt: string | null;
	quoteEn: string;
	kind: string;
}

const REFERENCE_COLS = `id, month_id AS monthId, title_en AS titleEn, publisher, url, published_at AS publishedAt, quote_en AS quoteEn, kind`;

export const insertMonthReference = db.query<
	{ id: number },
	[number, string, string, string, string | null, string, string]
>(
	`INSERT INTO month_references (month_id, title_en, publisher, url, published_at, quote_en, kind)
   VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);

export const listReferencesByMonth = db.query<MonthReferenceRow, [number]>(
	`SELECT ${REFERENCE_COLS} FROM month_references WHERE month_id = ? ORDER BY id ASC`,
);

export const findHijriMonthById = db.query<HijriMonthRow, [number]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE id = ?`,
);

// ---------------------------------------------------------------------------
// Public reads — drafts are NEVER public (editorial workspace only).
// Every public surface (API, pages, sitemap) must use these statements.
// ---------------------------------------------------------------------------

const PUBLIC_FILTER = `status != 'draft'`;

export const listPublicHijriMonthsAsc = db.query<HijriMonthRow, []>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE ${PUBLIC_FILTER} ORDER BY start_gregorian ASC, id ASC`,
);

export const listPublicHijriMonthsDesc = db.query<HijriMonthRow, [number, number]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE ${PUBLIC_FILTER} ORDER BY start_gregorian DESC, id DESC LIMIT ? OFFSET ?`,
);

export const listPublicHijriMonthsByYear = db.query<HijriMonthRow, [number]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE hijri_year = ? AND ${PUBLIC_FILTER} ORDER BY hijri_month ASC`,
);

export const countPublicHijriMonths = db.query<{ n: number }, []>(
	`SELECT COUNT(*) AS n FROM hijri_months WHERE ${PUBLIC_FILTER}`,
);

export const findPublicHijriMonthByKey = db.query<HijriMonthRow, [string]>(
	`SELECT ${HIJRI_MONTH_COLS} FROM hijri_months WHERE month_key = ? AND ${PUBLIC_FILTER}`,
);

/** Delete a month; sightings + references cascade. Returns rows deleted. */
export const deleteHijriMonth = db.query<{ n: number }, [number]>(
	`DELETE FROM hijri_months WHERE id = ? RETURNING 1 AS n`,
);

export const deleteSightingReport = db.query<{ n: number }, [number]>(
	`DELETE FROM sighting_reports WHERE id = ? RETURNING 1 AS n`,
);

export const deleteMonthReference = db.query<{ n: number }, [number]>(
	`DELETE FROM month_references WHERE id = ? RETURNING 1 AS n`,
);

export interface WitnessReportRow {
	id: number;
	monthKey: string;
	country: string;
	city: string | null;
	sightedOn: string;
	result: string;
	method: string;
	reporterName: string;
	contact: string | null;
	note: string;
	status: string;
	createdAt: string;
}

const WITNESS_COLS = `id, month_key AS monthKey, country, city, sighted_on AS sightedOn, result, method, reporter_name AS reporterName, contact, note, status, created_at AS createdAt`;

export const insertWitnessReport = db.query<
	{ id: number },
	[string, string, string | null, string, string, string, string, string | null, string, string, string]
>(
	`INSERT INTO witness_reports (month_key, country, city, sighted_on, result, method, reporter_name, contact, note, ip_hash, day)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);

export const listWitnessReportsByStatus = db.query<WitnessReportRow, [string]>(
	`SELECT ${WITNESS_COLS} FROM witness_reports WHERE status = ? ORDER BY id DESC`,
);

export const countPendingWitnessReports = db.query<{ n: number }, []>(
	`SELECT COUNT(*) AS n FROM witness_reports WHERE status = 'pending'`,
);

export const findWitnessReportById = db.query<WitnessReportRow, [number]>(
	`SELECT ${WITNESS_COLS} FROM witness_reports WHERE id = ?`,
);

export const setWitnessReportStatus = db.query<null, [string, number]>(
	`UPDATE witness_reports SET status = ? WHERE id = ?`,
);
