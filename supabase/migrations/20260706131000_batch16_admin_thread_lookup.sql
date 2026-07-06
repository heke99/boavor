-- ============================================================================
-- Batch 16 (part 2) — Admin thread metadata lookup
-- ============================================================================
-- Admins have no blanket read access to message content (by design). To make
-- support mode usable they still need to find the right thread. This definer
-- function exposes thread METADATA only (type, subject, timestamps, counts)
-- — never message bodies or attachments. Content requires an active
-- support_access_grant.
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.admin_recent_message_threads(p_limit integer default 50)
returns table (
  id uuid,
  thread_type text,
  subject text,
  application_id uuid,
  listing_id uuid,
  company_id uuid,
  created_at timestamptz,
  last_message_at timestamptz,
  participant_count bigint,
  message_count bigint
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    t.id,
    t.thread_type,
    t.subject,
    t.application_id,
    t.listing_id,
    t.company_id,
    t.created_at,
    t.last_message_at,
    (select count(*) from public.message_participants mp where mp.thread_id = t.id),
    (select count(*) from public.messages m where m.thread_id = t.id)
  from public.message_threads t
  where public.current_user_is_admin()
  order by t.last_message_at desc
  limit least(coalesce(p_limit, 50), 200)
$$;
