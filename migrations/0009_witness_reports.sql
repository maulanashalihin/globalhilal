-- 0009_witness_reports.sql — public crescent-sighting reports from anyone.
-- Anyone worldwide can submit via /contribute; editors review in
-- /admin/reports and promote accepted reports into sighting_reports.
-- Anti-spam: UNIQUE(ip_hash, day) enforces one submission per IP per day
-- (restart-proof, unlike the in-memory limiter; no raw IPs stored).

CREATE TABLE IF NOT EXISTS witness_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month_key     TEXT NOT NULL,                -- e.g. '1448-05' (must exist to approve)
  country       TEXT NOT NULL,
  city          TEXT,
  sighted_on    TEXT NOT NULL,                -- 'YYYY-MM-DD' (observation evening)
  result        TEXT NOT NULL CHECK (result IN ('seen','not_seen','cloudy')),
  method        TEXT NOT NULL CHECK (method IN ('naked_eye','telescope','both','unknown')),
  reporter_name TEXT NOT NULL,
  contact       TEXT,                         -- optional email/phone for follow-up
  note          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  ip_hash       TEXT NOT NULL,                -- SHA-256 of submitter IP
  day           TEXT NOT NULL,                -- UTC 'YYYY-MM-DD' of submission
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (ip_hash, day)
);

CREATE INDEX IF NOT EXISTS idx_witness_status ON witness_reports(status);
CREATE INDEX IF NOT EXISTS idx_witness_month ON witness_reports(month_key);
