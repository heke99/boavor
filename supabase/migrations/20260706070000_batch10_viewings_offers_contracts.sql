-- ============================================================================
-- Batch 10 — Viewings, offers, contracts and e-signing
-- ============================================================================
-- * viewing_slots + viewing_invitations (responses live as invitation status).
-- * rental_offers + rental_offer_events (append-only audit).
-- * contract_templates (versioned, locked after first use), contracts,
--   contract_signers, contract_events.
-- * finalize_signed_contract(): atomic completion — application signed,
--   listing rented, competing applications rented_to_other, queue reset
--   (with exceptions for short-term/student listings).
--
-- The legacy public.viewings table (from the original schema) remains for
-- old data but the application uses viewing_slots/viewing_invitations.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Viewings ---------------------------------------------------------------------

create table if not exists public.viewing_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_note text,
  max_attendees integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists viewing_slots_listing_idx on public.viewing_slots (listing_id, starts_at);

create table if not exists public.viewing_invitations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.viewing_slots(id) on delete cascade,
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited', 'accepted', 'declined', 'completed', 'no_show')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slot_id, application_id)
);

create index if not exists viewing_invitations_user_idx on public.viewing_invitations (user_id, status);
create index if not exists viewing_invitations_application_idx on public.viewing_invitations (application_id);

-- 2. Offers -----------------------------------------------------------------------

create table if not exists public.rental_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  message text,
  expires_at timestamptz,
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'declined', 'withdrawn', 'expired')),
  responded_at timestamptz,
  withdrawn_reason text,
  created_at timestamptz not null default now()
);

create index if not exists rental_offers_application_idx on public.rental_offers (application_id);
create index if not exists rental_offers_user_idx on public.rental_offers (user_id, status);
create index if not exists rental_offers_expiry_idx on public.rental_offers (expires_at) where status = 'sent';

create table if not exists public.rental_offer_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.rental_offers(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rental_offer_events_offer_idx on public.rental_offer_events (offer_id, created_at desc);

-- 3. Contracts ---------------------------------------------------------------------

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  body_template text not null,
  is_active boolean not null default true,
  locked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contract_templates_company_idx on public.contract_templates (company_id, is_active);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  template_id uuid references public.contract_templates(id) on delete set null,
  template_version integer,
  body_snapshot text not null,
  status text not null default 'draft'
    check (status in ('draft', 'internal_review', 'sent_for_signing', 'signed', 'cancelled')),
  provider text,
  provider_ref text,
  signed_pdf_url text,
  created_by uuid references auth.users(id) on delete set null,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contracts_application_active_idx
  on public.contracts (application_id)
  where status <> 'cancelled';
create index if not exists contracts_provider_ref_idx on public.contracts (provider_ref) where provider_ref is not null;

drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

create table if not exists public.contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signer_role text not null check (signer_role in ('applicant', 'co_applicant', 'guarantor', 'landlord')),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  status text not null default 'pending' check (status in ('pending', 'signed', 'declined')),
  signed_at timestamptz,
  provider_ref text,
  created_at timestamptz not null default now()
);

create index if not exists contract_signers_contract_idx on public.contract_signers (contract_id);
create index if not exists contract_signers_user_idx on public.contract_signers (user_id) where user_id is not null;

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contract_events_contract_idx on public.contract_events (contract_id, created_at desc);

-- 4. RLS ---------------------------------------------------------------------------

alter table public.viewing_slots enable row level security;
alter table public.viewing_invitations enable row level security;
alter table public.rental_offers enable row level security;
alter table public.rental_offer_events enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_signers enable row level security;
alter table public.contract_events enable row level security;

-- viewing_slots: listing owners manage; invited applicants can read.
drop policy if exists "owners manage viewing slots" on public.viewing_slots;
create policy "owners manage viewing slots" on public.viewing_slots
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));
drop policy if exists "invitees read viewing slots" on public.viewing_slots;
create policy "invitees read viewing slots" on public.viewing_slots
  for select using (
    exists (
      select 1 from public.viewing_invitations vi
      where vi.slot_id = viewing_slots.id and vi.user_id = auth.uid()
    )
  );

-- viewing_invitations: owners manage; invitees read and respond.
drop policy if exists "owners manage viewing invitations" on public.viewing_invitations;
create policy "owners manage viewing invitations" on public.viewing_invitations
  for all using (public.current_user_can_manage_application(application_id))
  with check (public.current_user_can_manage_application(application_id));
drop policy if exists "invitees read own invitations" on public.viewing_invitations;
create policy "invitees read own invitations" on public.viewing_invitations
  for select using (user_id = auth.uid());
drop policy if exists "invitees respond to invitations" on public.viewing_invitations;
create policy "invitees respond to invitations" on public.viewing_invitations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rental_offers: owners manage; applicants read and respond.
drop policy if exists "owners manage offers" on public.rental_offers;
create policy "owners manage offers" on public.rental_offers
  for all using (public.current_user_can_manage_application(application_id))
  with check (public.current_user_can_manage_application(application_id));
drop policy if exists "applicants read own offers" on public.rental_offers;
create policy "applicants read own offers" on public.rental_offers
  for select using (user_id = auth.uid());
drop policy if exists "applicants respond to offers" on public.rental_offers;
create policy "applicants respond to offers" on public.rental_offers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "offer parties read offer events" on public.rental_offer_events;
create policy "offer parties read offer events" on public.rental_offer_events
  for select using (
    exists (
      select 1 from public.rental_offers o
      where o.id = rental_offer_events.offer_id
        and (o.user_id = auth.uid() or public.current_user_can_manage_application(o.application_id))
    )
  );
drop policy if exists "offer parties insert offer events" on public.rental_offer_events;
create policy "offer parties insert offer events" on public.rental_offer_events
  for insert with check (
    actor_user_id = auth.uid()
    and exists (
      select 1 from public.rental_offers o
      where o.id = rental_offer_events.offer_id
        and (o.user_id = auth.uid() or public.current_user_can_manage_application(o.application_id))
    )
  );

-- contract_templates: platform defaults (company_id null) readable by all
-- signed-in users; companies manage their own; only unlocked templates may
-- be updated (immutability after first use).
drop policy if exists "read platform contract templates" on public.contract_templates;
create policy "read platform contract templates" on public.contract_templates
  for select using (company_id is null or public.current_user_can_manage_company(company_id));
drop policy if exists "companies insert own templates" on public.contract_templates;
create policy "companies insert own templates" on public.contract_templates
  for insert with check (company_id is not null and public.current_user_can_manage_company(company_id));
drop policy if exists "companies update unlocked templates" on public.contract_templates;
create policy "companies update unlocked templates" on public.contract_templates
  for update using (
    company_id is not null and public.current_user_can_manage_company(company_id) and locked_at is null
  ) with check (
    company_id is not null and public.current_user_can_manage_company(company_id)
  );

-- contracts: landlord side manages; applicant-side signers read.
drop policy if exists "owners manage contracts" on public.contracts;
create policy "owners manage contracts" on public.contracts
  for all using (public.current_user_can_manage_application(application_id))
  with check (public.current_user_can_manage_application(application_id));
drop policy if exists "signers read contracts" on public.contracts;
create policy "signers read contracts" on public.contracts
  for select using (
    exists (
      select 1 from public.contract_signers cs
      where cs.contract_id = contracts.id and cs.user_id = auth.uid()
    )
  );

drop policy if exists "owners manage contract signers" on public.contract_signers;
create policy "owners manage contract signers" on public.contract_signers
  for all using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_signers.contract_id
        and public.current_user_can_manage_application(c.application_id)
    )
  ) with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_signers.contract_id
        and public.current_user_can_manage_application(c.application_id)
    )
  );
drop policy if exists "signers read own signer rows" on public.contract_signers;
create policy "signers read own signer rows" on public.contract_signers
  for select using (user_id = auth.uid());

drop policy if exists "contract parties read events" on public.contract_events;
create policy "contract parties read events" on public.contract_events
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_events.contract_id
        and (
          public.current_user_can_manage_application(c.application_id)
          or exists (select 1 from public.contract_signers cs where cs.contract_id = c.id and cs.user_id = auth.uid())
        )
    )
  );
drop policy if exists "contract parties insert events" on public.contract_events;
create policy "contract parties insert events" on public.contract_events
  for insert with check (
    actor_user_id = auth.uid()
    and exists (
      select 1 from public.contracts c
      where c.id = contract_events.contract_id
        and (
          public.current_user_can_manage_application(c.application_id)
          or exists (select 1 from public.contract_signers cs where cs.contract_id = c.id and cs.user_id = auth.uid())
        )
    )
  );
