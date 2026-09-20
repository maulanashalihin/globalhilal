-- 0008_month_references.sql — decision references per Hijri month.
-- Each month records the rulings/announcements it is based on
-- (official announcement, state news agency, ministry, hilal committee).
-- Aggregators/blogs are supplementary only, never the sole basis.

CREATE TABLE IF NOT EXISTS month_references (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id      INTEGER NOT NULL REFERENCES hijri_months(id) ON DELETE CASCADE,
  title_en      TEXT NOT NULL,
  publisher     TEXT NOT NULL,
  url           TEXT NOT NULL,
  published_at  TEXT,
  quote_en      TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL DEFAULT 'official'
                CHECK (kind IN ('official','news','org','other')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_ref_month ON month_references(month_id);
