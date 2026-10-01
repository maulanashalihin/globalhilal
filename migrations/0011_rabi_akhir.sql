-- 0011_rabi_akhir.sql — adopt the classical Rabi' al-Akhir naming for month 4.
-- Matches the MONTH_NAMES update in src/server/hijri.ts (Rabi' al-Thani /
-- ربيع الثاني → Rabi' al-Akhir / ربيع الآخر). Guarded by the old value so
-- rows already created with the new name are a no-op.
UPDATE hijri_months SET month_name_en = 'Rabi'' al-Akhir' WHERE hijri_month = 4 AND month_name_en = 'Rabi'' al-Thani';
UPDATE hijri_months SET month_name_ar = 'ربيع الآخر' WHERE hijri_month = 4 AND month_name_ar = 'ربيع الثاني';
