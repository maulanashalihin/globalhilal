-- 0012_rabi_akhir_prose.sql — align the 1448-04 decision prose with the
-- Rabi' al-Akhir rename. 0011 renamed the month_name_* columns only; the
-- September decision summaries still used the old name, and they feed the
-- month page, og:description, and the public API. Scoped to the single
-- affected row so nothing else can change.
UPDATE hijri_months
SET decision_summary_en = REPLACE(decision_summary_en, 'Rabi'' al-Thani', 'Rabi'' al-Akhir')
WHERE month_key = '1448-04';
UPDATE hijri_months
SET decision_summary_ar = REPLACE(decision_summary_ar, 'ربيع الثاني', 'ربيع الآخر')
WHERE month_key = '1448-04';
