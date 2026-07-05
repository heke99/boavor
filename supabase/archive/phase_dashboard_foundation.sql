-- Dashboard foundation phase
-- Run after profile/register/commercial/dashboard lead phases.

alter table public.profile_documents
  add column if not exists document_status text not null default 'active',
  add column if not exists document_expires_at date,
  add column if not exists is_default_for_applications boolean not null default false;

create index if not exists profile_documents_user_default_idx
on public.profile_documents(user_id, is_default_for_applications);

create index if not exists rental_applications_listing_created_idx
on public.rental_applications(listing_id, created_at desc);

create index if not exists listings_created_by_status_idx
on public.listings(created_by, status);

create index if not exists listings_company_status_idx
on public.listings(company_id, status);

create table if not exists public.listing_activity_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.listing_activity_events enable row level security;

drop policy if exists "owners can read listing activity events" on public.listing_activity_events;
create policy "owners can read listing activity events"
on public.listing_activity_events
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_activity_events.listing_id
      and (
        l.created_by = auth.uid()
        or exists (
          select 1
          from public.company_members cm
          where cm.company_id = l.company_id
            and cm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "owners can insert listing activity events" on public.listing_activity_events;
create policy "owners can insert listing activity events"
on public.listing_activity_events
for insert
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.listings l
    where l.id = listing_activity_events.listing_id
      and (
        l.created_by = auth.uid()
        or exists (
          select 1
          from public.company_members cm
          where cm.company_id = l.company_id
            and cm.user_id = auth.uid()
        )
      )
  )
);
