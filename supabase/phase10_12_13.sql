-- Phase 10 + 12 + 13
-- Rental applications + user dashboard + owner portal

create type if not exists public.rental_application_status as enum (
  'submitted',
  'reviewing',
  'shortlisted',
  'offered',
  'rejected',
  'withdrawn'
);

create table if not exists public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  landlord_user_id uuid references auth.users(id) on delete set null,
  landlord_company_id uuid references public.companies(id) on delete set null,
  listing_slug text not null,
  listing_title text not null,
  listing_city text not null,
  listing_type public.listing_type not null default 'rent',
  listing_price integer not null default 0,
  listing_image_url text,
  applicant_full_name text not null,
  applicant_email text not null,
  applicant_phone text,
  applicant_monthly_income integer,
  applicant_household_size integer,
  queue_points_snapshot integer not null default 0,
  queue_joined_at_snapshot timestamptz,
  cover_letter text,
  applicant_snapshot jsonb,
  status public.rental_application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rental_application_co_applicants (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  relationship text,
  created_at timestamptz not null default now()
);

create table if not exists public.rental_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  document_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rental_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  from_status public.rental_application_status,
  to_status public.rental_application_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists rental_applications_user_id_idx on public.rental_applications(user_id);
create index if not exists rental_applications_listing_id_idx on public.rental_applications(listing_id);
create index if not exists rental_applications_landlord_user_id_idx on public.rental_applications(landlord_user_id);
create index if not exists rental_applications_landlord_company_id_idx on public.rental_applications(landlord_company_id);
create index if not exists rental_application_co_applicants_application_id_idx on public.rental_application_co_applicants(application_id);
create index if not exists rental_application_documents_application_id_idx on public.rental_application_documents(application_id);

create trigger rental_applications_updated_at
before update on public.rental_applications
for each row execute procedure public.set_updated_at();

alter table public.rental_applications enable row level security;
alter table public.rental_application_co_applicants enable row level security;
alter table public.rental_application_documents enable row level security;
alter table public.rental_application_status_history enable row level security;

create policy "users can create own rental applications"
on public.rental_applications
for insert
with check (auth.uid() = user_id);

create policy "users can read own rental applications"
on public.rental_applications
for select
using (auth.uid() = user_id);

create policy "owners can read incoming rental applications"
on public.rental_applications
for select
using (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = rental_applications.landlord_company_id
      and cm.user_id = auth.uid()
  )
);

create policy "owners can update incoming rental applications"
on public.rental_applications
for update
using (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = rental_applications.landlord_company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = rental_applications.landlord_company_id
      and cm.user_id = auth.uid()
  )
);

create policy "users can create own rental application co applicants"
on public.rental_application_co_applicants
for insert
with check (auth.uid() = user_id);

create policy "users can read own rental application co applicants"
on public.rental_application_co_applicants
for select
using (auth.uid() = user_id);

create policy "owners can read incoming application co applicants"
on public.rental_application_co_applicants
for select
using (
  exists (
    select 1
    from public.rental_applications ra
    where ra.id = rental_application_co_applicants.application_id
      and (
        ra.landlord_user_id = auth.uid()
        or exists (
          select 1
          from public.company_members cm
          where cm.company_id = ra.landlord_company_id
            and cm.user_id = auth.uid()
        )
      )
  )
);

create policy "users can create own rental application documents"
on public.rental_application_documents
for insert
with check (auth.uid() = user_id);

create policy "users can read own rental application documents"
on public.rental_application_documents
for select
using (auth.uid() = user_id);

create policy "owners can read incoming application documents"
on public.rental_application_documents
for select
using (
  exists (
    select 1
    from public.rental_applications ra
    where ra.id = rental_application_documents.application_id
      and (
        ra.landlord_user_id = auth.uid()
        or exists (
          select 1
          from public.company_members cm
          where cm.company_id = ra.landlord_company_id
            and cm.user_id = auth.uid()
        )
      )
  )
);

create policy "owners can insert application status history"
on public.rental_application_status_history
for insert
with check (
  auth.uid() = changed_by
  and exists (
    select 1
    from public.rental_applications ra
    where ra.id = rental_application_status_history.application_id
      and (
        ra.landlord_user_id = auth.uid()
        or exists (
          select 1
          from public.company_members cm
          where cm.company_id = ra.landlord_company_id
            and cm.user_id = auth.uid()
        )
      )
  )
);
