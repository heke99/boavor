-- ============================================================================
-- Batch 24 — Sales CRM for landlord acquisition
-- ============================================================================
-- * sales_leads: inbound interest from /hyresvardar (ROI calculator, demo
--   requests, contact form). Deliberately isolated from applicant data:
--   no FK to auth.users, lives entirely on the sales side.
-- * RLS: anonymous visitors may INSERT (the public funnel), only admins
--   read/manage. Server actions rate-limit submissions.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text,
  units_count integer,
  message text,
  source text not null default 'contact_form'
    check (source in ('roi_calculator', 'demo_request', 'contact_form')),
  roi_snapshot jsonb,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'demo', 'negotiation', 'won', 'lost')),
  assigned_to uuid,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_leads_status_idx on public.sales_leads (status, created_at desc);

drop trigger if exists sales_leads_updated_at on public.sales_leads;
create trigger sales_leads_updated_at before update on public.sales_leads
  for each row execute function public.set_updated_at();

alter table public.sales_leads enable row level security;

drop policy if exists "anyone can create sales leads" on public.sales_leads;
create policy "anyone can create sales leads" on public.sales_leads
  for insert with check (
    char_length(btrim(company_name)) > 0
    and char_length(btrim(contact_name)) > 0
    and position('@' in email) > 1
  );
drop policy if exists "admins manage sales leads" on public.sales_leads;
create policy "admins manage sales leads" on public.sales_leads
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
