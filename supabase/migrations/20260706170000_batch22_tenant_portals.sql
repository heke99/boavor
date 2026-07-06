-- ============================================================================
-- Batch 22 — White-label tenant portals
-- ============================================================================
-- * tenant_portals: one branded public portal per company (slug-routed at
--   /p/<slug>, optionally mapped from a custom domain by the proxy).
-- * Portal scoping: the portal only ever exposes the owning company's
--   PUBLISHED listings, optionally narrowed to a list of cities.
-- * Branding is limited to safe fields (name, tagline, hex colour, logo URL)
--   — no arbitrary HTML/CSS injection.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.tenant_portals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46})[a-z0-9]$'),
  name text not null,
  tagline text,
  description text,
  primary_color text not null default '#243b8f' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  contact_email text,
  custom_domain text unique,
  cities text[] not null default '{}',
  show_queue_info boolean not null default true,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_portals_company_idx on public.tenant_portals (company_id);
create index if not exists tenant_portals_domain_idx on public.tenant_portals (custom_domain)
  where custom_domain is not null;

drop trigger if exists tenant_portals_updated_at on public.tenant_portals;
create trigger tenant_portals_updated_at before update on public.tenant_portals
  for each row execute function public.set_updated_at();

alter table public.tenant_portals enable row level security;

drop policy if exists "public reads active portals" on public.tenant_portals;
create policy "public reads active portals" on public.tenant_portals
  for select using (is_active = true);
drop policy if exists "company members manage portals" on public.tenant_portals;
create policy "company members manage portals" on public.tenant_portals
  for all using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = tenant_portals.company_id and cm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = tenant_portals.company_id and cm.user_id = auth.uid()
    )
  );
drop policy if exists "admins read all portals" on public.tenant_portals;
create policy "admins read all portals" on public.tenant_portals
  for select using (public.current_user_is_admin());
