-- Listing Detail Management phase
-- Run after dashboard foundation phases.

create table if not exists public.listing_internal_notes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_internal_notes_listing_id_created_idx
on public.listing_internal_notes(listing_id, created_at desc);

alter table public.listing_internal_notes enable row level security;

drop policy if exists "owners can read listing internal notes" on public.listing_internal_notes;
create policy "owners can read listing internal notes"
on public.listing_internal_notes
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_internal_notes.listing_id
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

drop policy if exists "owners can insert listing internal notes" on public.listing_internal_notes;
create policy "owners can insert listing internal notes"
on public.listing_internal_notes
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.listings l
    where l.id = listing_internal_notes.listing_id
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

create index if not exists listing_activity_events_listing_id_created_idx
on public.listing_activity_events(listing_id, created_at desc);
