-- ============================================================================
-- Batch 0 — Align rental_application_status enum with the application code
-- ============================================================================
-- The live enum came from the legacy archive/schema 1.sql:
--   draft, submitted, received, reviewing, qualified, reserve, viewing,
--   offered, rejected, signed
--
-- The application code (status pickers, filters, apply flow) also uses
-- 'shortlisted' and 'withdrawn' (from the never-applied archive/phase10_12_13
-- enum). Updating an application to either value failed at runtime with an
-- invalid enum error. Enum additions are additive and irreversible.
--
-- The full workflow status set (screening, viewing_invited, offer_accepted,
-- contract_pending, expired, rented_to_other, ...) is added in Batch 7
-- together with the server-side status machine.
-- ============================================================================

alter type public.rental_application_status add value if not exists 'shortlisted';
alter type public.rental_application_status add value if not exists 'withdrawn';
