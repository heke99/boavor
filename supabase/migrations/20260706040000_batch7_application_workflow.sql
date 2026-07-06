-- ============================================================================
-- Batch 7 — Application workflow: full status set, selection methods, ranking
-- ============================================================================
-- * rental_application_status gains the full workflow statuses. Legacy values
--   (received, reserve, viewing) remain valid but are treated as aliases by
--   the server-side status machine (lib/applications/status-machine.ts).
-- * listings.selection_method controls how applicants are ranked.
-- * rental_applications gains rejection_reason and random_rank (auditable
--   random order for the "random" selection method).
--
-- Enum additions are additive and irreversible. Safe to re-run.
-- ============================================================================

alter type public.rental_application_status add value if not exists 'screening';
alter type public.rental_application_status add value if not exists 'not_qualified';
alter type public.rental_application_status add value if not exists 'viewing_invited';
alter type public.rental_application_status add value if not exists 'viewing_booked';
alter type public.rental_application_status add value if not exists 'offer_accepted';
alter type public.rental_application_status add value if not exists 'contract_pending';
alter type public.rental_application_status add value if not exists 'expired';
alter type public.rental_application_status add value if not exists 'rented_to_other';

alter table public.listings add column if not exists selection_method text not null default 'manual_with_policy'
  check (selection_method in ('strict_queue', 'guided_queue', 'first_come', 'random', 'manual_with_policy'));

alter table public.rental_applications add column if not exists rejection_reason text;
alter table public.rental_applications add column if not exists random_rank double precision;

create index if not exists rental_applications_listing_status_idx
  on public.rental_applications (listing_id, status);
