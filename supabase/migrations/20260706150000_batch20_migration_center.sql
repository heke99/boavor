-- ============================================================================
-- Batch 20 — Landlord migration/import center
-- ============================================================================
-- * migration_projects: one import project per uploaded dataset. The raw CSV
--   is stored on the project (capped in the app layer) together with the
--   column mapping so the mapping can be adjusted before running.
-- * migration_runs: dry runs, imports and rollbacks with stats.
-- * migration_items: one row per source line with outcome and, after a real
--   import, the created entity id — this is what makes rollback-by-project
--   possible.
-- * Privacy gate lives in the app layer: CSV columns that look like tenant
--   PII (personnummer, namn, e-post, telefon) are rejected before anything
--   is stored.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.migration_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  source_label text,
  status text not null default 'draft'
    check (status in ('draft', 'dry_run', 'imported', 'rolled_back')),
  raw_csv text not null,
  headers jsonb not null default '[]'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint migration_projects_owner_check check (company_id is not null or owner_user_id is not null)
);

create index if not exists migration_projects_company_idx on public.migration_projects (company_id);
create index if not exists migration_projects_owner_idx on public.migration_projects (owner_user_id);

drop trigger if exists migration_projects_updated_at on public.migration_projects;
create trigger migration_projects_updated_at before update on public.migration_projects
  for each row execute function public.set_updated_at();

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.migration_projects(id) on delete cascade,
  run_type text not null check (run_type in ('dry_run', 'import', 'rollback')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists migration_runs_project_idx on public.migration_runs (project_id, created_at desc);

create table if not exists public.migration_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.migration_projects(id) on delete cascade,
  run_id uuid references public.migration_runs(id) on delete set null,
  row_number integer not null,
  entity_type text not null check (entity_type in ('property', 'unit')),
  entity_id uuid,
  source_row jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'valid', 'imported', 'skipped', 'error', 'rolled_back')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists migration_items_project_idx on public.migration_items (project_id, row_number);
create index if not exists migration_items_entity_idx on public.migration_items (entity_id) where entity_id is not null;

-- RLS: the project owner (user or company member) manages everything; runs
-- and items follow their project.
alter table public.migration_projects enable row level security;
alter table public.migration_runs enable row level security;
alter table public.migration_items enable row level security;

create or replace function public.current_user_owns_migration_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.migration_projects p
    where p.id = target_project_id
      and (
        p.owner_user_id = auth.uid()
        or (p.company_id is not null and exists (
          select 1 from public.company_members cm
          where cm.company_id = p.company_id and cm.user_id = auth.uid()
        ))
      )
  );
$$;

drop policy if exists "owners manage migration projects" on public.migration_projects;
create policy "owners manage migration projects" on public.migration_projects
  for all using (
    owner_user_id = auth.uid()
    or (company_id is not null and exists (
      select 1 from public.company_members cm
      where cm.company_id = migration_projects.company_id and cm.user_id = auth.uid()
    ))
  ) with check (
    owner_user_id = auth.uid()
    or (company_id is not null and exists (
      select 1 from public.company_members cm
      where cm.company_id = migration_projects.company_id and cm.user_id = auth.uid()
    ))
  );

drop policy if exists "owners manage migration runs" on public.migration_runs;
create policy "owners manage migration runs" on public.migration_runs
  for all using (public.current_user_owns_migration_project(project_id))
  with check (public.current_user_owns_migration_project(project_id));

drop policy if exists "owners manage migration items" on public.migration_items;
create policy "owners manage migration items" on public.migration_items
  for all using (public.current_user_owns_migration_project(project_id))
  with check (public.current_user_owns_migration_project(project_id));
