-- ============================================================================
-- Batch 15 (part 2) — Analytics aggregate helpers
-- ============================================================================
-- Grouped counts computed in the database instead of shipping raw event rows
-- to the app. Both functions are SECURITY INVOKER on purpose: RLS on
-- analytics_events decides what the caller may count (landlords only see
-- events for listings they manage, admins see everything).
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.get_listing_view_counts(
  p_listing_ids uuid[],
  p_since timestamptz
)
returns table (listing_id uuid, views bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select e.listing_id, count(*)::bigint as views
  from public.analytics_events e
  where e.listing_id = any (p_listing_ids)
    and e.event_type = 'listing_view'
    and e.created_at >= p_since
  group by e.listing_id
$$;

create or replace function public.get_event_type_counts(
  p_since timestamptz
)
returns table (event_type text, events bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select e.event_type, count(*)::bigint as events
  from public.analytics_events e
  where e.created_at >= p_since
  group by e.event_type
$$;
