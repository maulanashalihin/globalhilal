-- 0006_hijri_months.sql — one row per Hijri month (GlobalHilal, testimony-based).
-- start_gregorian is the UTC date of the first valid testimony.
-- Late testimony from another timezone maps to the SAME date (retroactive day-1):
-- there is deliberately no day-boundary column. No forecasts are stored;
-- next_observation_date is always computed as start_gregorian + 28 days.

CREATE TABLE IF NOT EXISTS hijri_months (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hijri_year          INTEGER NOT NULL,
  hijri_month         INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  month_key           TEXT NOT NULL UNIQUE,
  month_name_en       TEXT NOT NULL,
  month_name_ar       TEXT NOT NULL,
  start_gregorian     TEXT NOT NULL,
  end_gregorian       TEXT,
  length_days         INTEGER CHECK (length_days IN (29, 30)),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','provisional','confirmed','corrected')),
  decision_summary_en TEXT NOT NULL DEFAULT '',
  created_by          INTEGER REFERENCES users(id),
  published_at        TEXT,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hijri_months_key ON hijri_months(month_key);
CREATE INDEX IF NOT EXISTS idx_hijri_months_start ON hijri_months(start_gregorian);
CREATE INDEX IF NOT EXISTS idx_hijri_months_year ON hijri_months(hijri_year);
