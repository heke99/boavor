-- ============================================================================
-- Batch 26 — Conversion tracking: queue_joined event
-- ============================================================================
-- Extends the analytics event whitelist with the platform's core conversion:
-- joining the housing queue.
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.track_analytics_event(
  p_event_type text,
  p_listing_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_event_type not in (
    'listing_view', 'search_performed', 'application_submitted', 'inquiry_submitted',
    'saved_search_created', 'exchange_interest', 'registration_completed', 'queue_joined'
  ) then
    raise exception 'unknown event type';
  end if;

  insert into public.analytics_events (event_type, listing_id, user_id, metadata)
  values (p_event_type, p_listing_id, auth.uid(), coalesce(p_metadata, '{}'::jsonb));
end;
$$;
