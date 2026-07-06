-- ============================================================================
-- Batch 6 — Landlord policy engine and Matchkoll
-- ============================================================================
-- * landlord_policies + policy_rules: versioned rule sets owned by a landlord
--   (user or company). Editing rules creates a new version; old versions are
--   immutable so historical evaluations stay auditable.
-- * listing_policy_assignments: which policy applies to a listing.
-- * policy_evaluations: every Matchkoll run (precheck or application) with an
--   immutable outcome snapshot.
-- * application_policy_results: one immutable result per application.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Policies ---------------------------------------------------------------------

create table if not exists public.landlord_policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text,
  current_version integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landlord_policies_owner_check check (owner_user_id is not null or company_id is not null)
);

create index if not exists landlord_policies_owner_idx on public.landlord_policies (owner_user_id);
create index if not exists landlord_policies_company_idx on public.landlord_policies (company_id);

drop trigger if exists landlord_policies_updated_at on public.landlord_policies;
create trigger landlord_policies_updated_at before update on public.landlord_policies
  for each row execute function public.set_updated_at();

create table if not exists public.policy_rules (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.landlord_policies(id) on delete cascade,
  version integer not null default 1,
  rule_type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists policy_rules_policy_version_idx on public.policy_rules (policy_id, version);

create table if not exists public.listing_policy_assignments (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  policy_id uuid not null references public.landlord_policies(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists listing_policy_assignments_policy_idx on public.listing_policy_assignments (policy_id);

-- 2. Evaluations -------------------------------------------------------------------

create table if not exists public.policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_id uuid references public.landlord_policies(id) on delete set null,
  policy_version integer,
  context text not null default 'precheck' check (context in ('precheck', 'application')),
  result text not null check (result in ('eligible', 'likely_eligible', 'missing_info', 'not_eligible')),
  outcomes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists policy_evaluations_listing_idx on public.policy_evaluations (listing_id, created_at desc);
create index if not exists policy_evaluations_user_idx on public.policy_evaluations (user_id, created_at desc);

create table if not exists public.application_policy_results (
  application_id uuid primary key references public.rental_applications(id) on delete cascade,
  evaluation_id uuid references public.policy_evaluations(id) on delete set null,
  result text not null check (result in ('eligible', 'likely_eligible', 'missing_info', 'not_eligible')),
  outcomes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. RLS ---------------------------------------------------------------------------

alter table public.landlord_policies enable row level security;
alter table public.policy_rules enable row level security;
alter table public.listing_policy_assignments enable row level security;
alter table public.policy_evaluations enable row level security;
alter table public.application_policy_results enable row level security;

-- landlord_policies: owners manage; admins read; public may read policies
-- attached to published listings (their content is public via the listing).
drop policy if exists "owners manage policies" on public.landlord_policies;
create policy "owners manage policies" on public.landlord_policies
  for all using (
    owner_user_id = auth.uid() or public.current_user_can_manage_company(company_id)
  ) with check (
    owner_user_id = auth.uid() or public.current_user_can_manage_company(company_id)
  );
drop policy if exists "admins read policies" on public.landlord_policies;
create policy "admins read policies" on public.landlord_policies
  for select using (public.current_user_is_admin());
drop policy if exists "public reads policies on published listings" on public.landlord_policies;
create policy "public reads policies on published listings" on public.landlord_policies
  for select using (
    exists (
      select 1
      from public.listing_policy_assignments lpa
      join public.listings l on l.id = lpa.listing_id
      where lpa.policy_id = landlord_policies.id
        and l.status = 'published'
    )
  );

-- policy_rules: same visibility as their policy.
drop policy if exists "owners manage policy rules" on public.policy_rules;
create policy "owners manage policy rules" on public.policy_rules
  for all using (
    exists (
      select 1 from public.landlord_policies p
      where p.id = policy_rules.policy_id
        and (p.owner_user_id = auth.uid() or public.current_user_can_manage_company(p.company_id))
    )
  ) with check (
    exists (
      select 1 from public.landlord_policies p
      where p.id = policy_rules.policy_id
        and (p.owner_user_id = auth.uid() or public.current_user_can_manage_company(p.company_id))
    )
  );
drop policy if exists "admins read policy rules" on public.policy_rules;
create policy "admins read policy rules" on public.policy_rules
  for select using (public.current_user_is_admin());
drop policy if exists "public reads rules on published listings" on public.policy_rules;
create policy "public reads rules on published listings" on public.policy_rules
  for select using (
    exists (
      select 1
      from public.listing_policy_assignments lpa
      join public.listings l on l.id = lpa.listing_id
      where lpa.policy_id = policy_rules.policy_id
        and l.status = 'published'
    )
  );

-- listing_policy_assignments: listing owners manage; public read for published.
drop policy if exists "owners manage listing policy assignments" on public.listing_policy_assignments;
create policy "owners manage listing policy assignments" on public.listing_policy_assignments
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));
drop policy if exists "public reads assignments for published listings" on public.listing_policy_assignments;
create policy "public reads assignments for published listings" on public.listing_policy_assignments
  for select using (
    exists (select 1 from public.listings l where l.id = listing_policy_assignments.listing_id and l.status = 'published')
  );

-- policy_evaluations: users create/read own; listing owners read evaluations
-- for their listings (application context only); admins read all.
drop policy if exists "users create own evaluations" on public.policy_evaluations;
create policy "users create own evaluations" on public.policy_evaluations
  for insert with check (auth.uid() = user_id);
drop policy if exists "users read own evaluations" on public.policy_evaluations;
create policy "users read own evaluations" on public.policy_evaluations
  for select using (auth.uid() = user_id);
drop policy if exists "owners read application evaluations" on public.policy_evaluations;
create policy "owners read application evaluations" on public.policy_evaluations
  for select using (
    context = 'application' and public.current_user_can_manage_listing(listing_id)
  );
drop policy if exists "admins read evaluations" on public.policy_evaluations;
create policy "admins read evaluations" on public.policy_evaluations
  for select using (public.current_user_is_admin());

-- application_policy_results: applicant reads own; managing landlord reads;
-- applicant writes at submit (immutable: no update policy).
drop policy if exists "applicants insert application policy results" on public.application_policy_results;
create policy "applicants insert application policy results" on public.application_policy_results
  for insert with check (
    exists (
      select 1 from public.rental_applications ra
      where ra.id = application_policy_results.application_id and ra.user_id = auth.uid()
    )
  );
drop policy if exists "applicants read own application policy results" on public.application_policy_results;
create policy "applicants read own application policy results" on public.application_policy_results
  for select using (
    exists (
      select 1 from public.rental_applications ra
      where ra.id = application_policy_results.application_id and ra.user_id = auth.uid()
    )
  );
drop policy if exists "owners read application policy results" on public.application_policy_results;
create policy "owners read application policy results" on public.application_policy_results
  for select using (public.current_user_can_manage_application(application_id));
drop policy if exists "admins read application policy results" on public.application_policy_results;
create policy "admins read application policy results" on public.application_policy_results
  for select using (public.current_user_is_admin());
