-- 0010_bilingual_content.sql — Arabic translations for editorial content.
-- Every `_ar` column is optional: empty string means "not translated yet"
-- and the public site falls back to the English text at render time.
-- Admin shows a warning (never blocks publishing) when a published month
-- has no Arabic yet.

ALTER TABLE hijri_months     ADD COLUMN decision_summary_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE sighting_reports ADD COLUMN note_ar             TEXT NOT NULL DEFAULT '';
ALTER TABLE month_references ADD COLUMN title_ar            TEXT NOT NULL DEFAULT '';
ALTER TABLE month_references ADD COLUMN quote_ar            TEXT NOT NULL DEFAULT '';
