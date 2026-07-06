-- ============================================================================
-- Batch 9 — In-platform messaging
-- ============================================================================
-- * message_threads / message_participants / messages / message_attachments
--   + message_events (audit: created, attachment_opened, locked, unlocked).
-- * Read state and reminders live on message_participants (last_read_at,
--   unread_reminded_at) instead of separate read-receipt tables.
-- * Threads bind to applications (listing/company denormalized), support and
--   exchange threads reuse the same model in later batches.
-- * Landlords start application threads (SECURITY DEFINER function inserts
--   both participants atomically); applicants can reply afterwards.
-- * Locking: after the response deadline or manual lock, only landlord-side
--   participants can post until unlocked.
-- * Private storage bucket message-attachments (30 MB, jpg/png/pdf).
--
-- Safe to re-run.
-- ============================================================================

-- 1. Tables ----------------------------------------------------------------------

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null default 'application'
    check (thread_type in ('application', 'listing', 'support', 'exchange')),
  application_id uuid references public.rental_applications(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  subject text not null,
  created_by uuid references auth.users(id) on delete set null,
  response_deadline_at timestamptz,
  locked_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_threads_application_idx on public.message_threads (application_id);
create index if not exists message_threads_last_message_idx on public.message_threads (last_message_at desc);

drop trigger if exists message_threads_updated_at on public.message_threads;
create trigger message_threads_updated_at before update on public.message_threads
  for each row execute function public.set_updated_at();

create table if not exists public.message_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_role text not null default 'member'
    check (participant_role in ('landlord', 'applicant', 'support', 'member')),
  display_name text,
  last_read_at timestamptz,
  unread_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create index if not exists message_participants_user_idx on public.message_participants (user_id, thread_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  content_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_idx on public.message_attachments (message_id);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists message_events_thread_idx on public.message_events (thread_id, created_at desc);

-- 2. Participant helper -----------------------------------------------------------

create or replace function public.current_user_is_thread_participant(target_thread_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.message_participants mp
    where mp.thread_id = target_thread_id
      and mp.user_id = auth.uid()
  );
$$;

-- 3. Thread creation (landlord starts after an application exists) -----------------

create or replace function public.create_application_thread(
  p_application_id uuid,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_application record;
  v_thread_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.current_user_can_manage_application(p_application_id) then
    raise exception 'not authorized';
  end if;

  select id, user_id, listing_id, landlord_company_id, listing_title
  into v_application
  from public.rental_applications
  where id = p_application_id;

  if v_application.user_id is null then
    raise exception 'application has no applicant user';
  end if;

  -- Reuse an existing thread for the application if one exists.
  select id into v_thread_id
  from public.message_threads
  where application_id = p_application_id
  limit 1;

  if v_thread_id is null then
    insert into public.message_threads (thread_type, application_id, listing_id, company_id, subject, created_by)
    values (
      'application',
      p_application_id,
      v_application.listing_id,
      v_application.landlord_company_id,
      coalesce(nullif(trim(p_subject), ''), coalesce(v_application.listing_title, 'Din bostadsansökan')),
      auth.uid()
    )
    returning id into v_thread_id;

    insert into public.message_participants (thread_id, user_id, participant_role)
    values
      (v_thread_id, auth.uid(), 'landlord'),
      (v_thread_id, v_application.user_id, 'applicant')
    on conflict (thread_id, user_id) do nothing;
  end if;

  if nullif(trim(p_body), '') is not null then
    insert into public.messages (thread_id, sender_user_id, body)
    values (v_thread_id, auth.uid(), trim(p_body));
  end if;

  insert into public.message_events (thread_id, actor_user_id, event_type)
  values (v_thread_id, auth.uid(), 'thread_created');

  return v_thread_id;
end;
$$;

-- 4. Message trigger: bump thread + notify other participants ----------------------

create or replace function public.on_message_created()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.message_threads
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.thread_id;

  insert into public.message_events (thread_id, actor_user_id, event_type, payload)
  values (new.thread_id, new.sender_user_id, 'message_created', jsonb_build_object('message_id', new.id));

  insert into public.notifications (user_id, title, body)
  select mp.user_id, 'Nytt meddelande', left(new.body, 140)
  from public.message_participants mp
  where mp.thread_id = new.thread_id
    and mp.user_id <> new.sender_user_id;

  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.on_message_created();

-- 5. RLS ----------------------------------------------------------------------------

alter table public.message_threads enable row level security;
alter table public.message_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_events enable row level security;

-- Threads: participants only. (Admin support mode with reason arrives in
-- Batch 16 — no blanket admin read by design.)
drop policy if exists "participants read threads" on public.message_threads;
create policy "participants read threads" on public.message_threads
  for select using (public.current_user_is_thread_participant(id));
drop policy if exists "landlords update own threads" on public.message_threads;
create policy "landlords update own threads" on public.message_threads
  for update using (
    exists (
      select 1 from public.message_participants mp
      where mp.thread_id = message_threads.id
        and mp.user_id = auth.uid()
        and mp.participant_role in ('landlord', 'support')
    )
  ) with check (
    exists (
      select 1 from public.message_participants mp
      where mp.thread_id = message_threads.id
        and mp.user_id = auth.uid()
        and mp.participant_role in ('landlord', 'support')
    )
  );

-- Participants: visible to fellow participants; own row updatable (read state).
drop policy if exists "participants read participants" on public.message_participants;
create policy "participants read participants" on public.message_participants
  for select using (public.current_user_is_thread_participant(thread_id));
drop policy if exists "participants update own row" on public.message_participants;
create policy "participants update own row" on public.message_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messages: participants read; senders post unless the thread is locked for
-- their role (locked threads accept landlord/support posts only).
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages
  for select using (public.current_user_is_thread_participant(thread_id));
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and public.current_user_is_thread_participant(thread_id)
    and (
      not exists (
        select 1 from public.message_threads t
        where t.id = messages.thread_id and t.locked_at is not null
      )
      or exists (
        select 1 from public.message_participants mp
        where mp.thread_id = messages.thread_id
          and mp.user_id = auth.uid()
          and mp.participant_role in ('landlord', 'support')
      )
    )
  );

-- Attachments follow their message's thread.
drop policy if exists "participants read attachments" on public.message_attachments;
create policy "participants read attachments" on public.message_attachments
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and public.current_user_is_thread_participant(m.thread_id)
    )
  );
drop policy if exists "senders attach files" on public.message_attachments;
create policy "senders attach files" on public.message_attachments
  for insert with check (
    exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_user_id = auth.uid()
    )
  );

-- Events: participants read; inserts happen via definer functions/actions.
drop policy if exists "participants read message events" on public.message_events;
create policy "participants read message events" on public.message_events
  for select using (public.current_user_is_thread_participant(thread_id));
drop policy if exists "participants insert message events" on public.message_events;
create policy "participants insert message events" on public.message_events
  for insert with check (
    actor_user_id = auth.uid() and public.current_user_is_thread_participant(thread_id)
  );

-- 6. Storage bucket -----------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  31457280,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "participants upload message attachments" on storage.objects;
create policy "participants upload message attachments" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'message-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "participants read message attachment files" on storage.objects;
create policy "participants read message attachment files" on storage.objects
  for select to authenticated using (
    bucket_id = 'message-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.message_attachments ma
        join public.messages m on m.id = ma.message_id
        where ma.file_url = ('storage:message-attachments/' || objects.name)
          and public.current_user_is_thread_participant(m.thread_id)
      )
    )
  );
