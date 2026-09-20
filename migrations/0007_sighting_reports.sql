-- 0007_sighting_reports.sql — testimony evidence per Hijri month.
-- verified=1 means the testimony credibility was checked (syahadah basis).
-- note_en must record: who testified, where, and how it was verified.

CREATE TABLE IF NOT EXISTS sighting_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id      INTEGER NOT NULL REFERENCES hijri_months(id) ON DELETE CASCADE,
  country       TEXT NOT NULL,
  city          TEXT,
  lat           REAL,
  lon           REAL,
  sighted_on    TEXT NOT NULL,
  result        TEXT NOT NULL CHECK (result IN ('seen','not_seen','cloudy')),
  method        TEXT NOT NULL CHECK (method IN ('naked_eye','telescope','both','unknown')),
  witness_org   TEXT,
  verified      INTEGER NOT NULL DEFAULT 0,
  note_en       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_sighting_month ON sighting_reports(month_id);
