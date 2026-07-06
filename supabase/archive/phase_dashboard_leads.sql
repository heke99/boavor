-- Dashboard leads and listing management phase
-- Run after phase_commercial_marketplace.sql and phase_dynamic_search.sql.

alter table public.listing_inquiries
  add column if not exists internal_note text,
  add column if not exists status_updated_at timestamptz;

create index if not exists listing_inquiries_created_at_idx on public.listing_inquiries(created_at desc);
create index if not exists listing_inquiries_status_created_at_idx on public.listing_inquiries(status, created_at desc);

-- Keep a timestamp when owners move a lead through the pipeline.
create or replace function public.set_listing_inquiry_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists listing_inquiries_status_updated_at on public.listing_inquiries;
create trigger listing_inquiries_status_updated_at
before update on public.listing_inquiries
for each row execute procedure public.set_listing_inquiry_status_updated_at();

-- Defensive policy refresh for listing owner updates. Keeps existing insert/read policies intact.
drop policy if exists "owners can update incoming listing inquiries" on public.listing_inquiries;
create policy "owners can update incoming listing inquiries"
on public.listing_inquiries
for update
using (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = listing_inquiries.landlord_company_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.listings l
    join public.company_members cm on cm.company_id = l.company_id
    where l.id = listing_inquiries.listing_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = listing_inquiries.landlord_company_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.listings l
    join public.company_members cm on cm.company_id = l.company_id
    where l.id = listing_inquiries.listing_id
      and cm.user_id = auth.uid()
  )
);
