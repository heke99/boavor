-- Bovaro lifecycle cross-company isolation. Safe: always rolls back.
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/canonical_lifecycle_rls.sql

begin;

do $$
declare
  u_a uuid;
  u_b uuid;
  c_a uuid := 'a1000000-0000-4000-8000-000000000001';
  c_b uuid := 'b1000000-0000-4000-8000-000000000001';
  property_b uuid := 'b2000000-0000-4000-8000-000000000001';
  unit_b uuid := 'b3000000-0000-4000-8000-000000000001';
  listing_b uuid := 'b4000000-0000-4000-8000-000000000001';
  application_b uuid := 'b5000000-0000-4000-8000-000000000001';
  contract_b uuid := 'b6000000-0000-4000-8000-000000000001';
  tenancy_b uuid := 'b7000000-0000-4000-8000-000000000001';
  invoice_b uuid := 'b8000000-0000-4000-8000-000000000001';
  document_b uuid := 'b9000000-0000-4000-8000-000000000001';
  n bigint;
begin
  select id into u_a from public.profiles where role not in ('admin','super_admin') order by id limit 1;
  select id into u_b from public.profiles where role not in ('admin','super_admin') and id <> u_a order by id limit 1;
  if u_a is null or u_b is null then
    raise exception 'Lifecycle RLS tests require two non-admin users';
  end if;

  insert into public.companies (id, name, slug, created_by)
  values (c_a, 'RLS Company A', 'rls-company-a', u_a), (c_b, 'RLS Company B', 'rls-company-b', u_b);
  insert into public.company_members (company_id, user_id, role, team_role)
  values (c_a, u_a, 'company_admin', 'owner'), (c_b, u_b, 'company_admin', 'owner');
  insert into public.properties (id, company_id, name, city) values (property_b, c_b, 'B property', 'Teststad');
  insert into public.units (id, property_id, unit_number) values (unit_b, property_b, 'B-1');
  insert into public.listings (id, company_id, created_by, title, slug, listing_type, property_type, city, unit_id)
  values (listing_b, c_b, u_b, 'B listing', 'rls-b-listing', 'rent', 'apartment', 'Teststad', unit_b);
  insert into public.rental_applications (id, listing_id, user_id, applicant_user_id, landlord_company_id, status)
  values (application_b, listing_b, u_b, u_b, c_b, 'submitted');
  insert into public.contracts (id, application_id, listing_id, body_snapshot, company_id, status)
  values (contract_b, application_b, listing_b, 'RLS contract', c_b, 'draft');
  insert into public.tenancies (id, company_id, tenancy_number, contract_id, unit_id, primary_user_id, starts_on)
  values (tenancy_b, c_b, 'HG-RLS-B', contract_b, unit_b, u_b, current_date);
  insert into public.rent_invoices (
    id, company_id, tenancy_id, invoice_number, period_start, period_end, due_date, total_ore, status
  ) values (
    invoice_b, c_b, tenancy_b, 'FA-RLS-B', current_date, current_date, current_date + 10, 10000, 'issued'
  );
  insert into public.maintenance_cases (
    company_id, tenancy_id, unit_id, case_number, category, title, description, submitted_by
  ) values (c_b, tenancy_b, unit_b, 'MA-RLS-B', 'other', 'RLS issue', 'Isolation fixture', u_b);
  insert into public.lease_terminations (
    company_id, tenancy_id, termination_number, initiated_by, requested_by,
    requested_end_date, notice_months
  ) values (c_b, tenancy_b, 'UP-RLS-B', 'tenant', u_b, current_date + 90, 3);
  insert into public.documents (id, company_id, owner_user_id, category, title)
  values (document_b, c_b, u_b, 'test', 'B private document');
  insert into public.domain_events (company_id, aggregate_type, aggregate_id, event_type)
  values (c_b, 'tenancy', tenancy_b, 'rls.fixture');
  insert into public.support_tickets (user_id, company_id, ticket_number, support_scope, subject)
  values (u_b, c_b, 'SU-RLS-B', 'landlord', 'B private ticket');

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);

  select count(*) into n from public.properties where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B properties'; end if;
  select count(*) into n from public.listings where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B listings'; end if;
  select count(*) into n from public.rental_applications where landlord_company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B applications'; end if;
  select count(*) into n from public.contracts where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B contracts'; end if;
  select count(*) into n from public.tenancies where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B tenancies'; end if;
  select count(*) into n from public.rent_invoices where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B rent ledger'; end if;
  select count(*) into n from public.maintenance_cases where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B maintenance'; end if;
  select count(*) into n from public.lease_terminations where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B terminations'; end if;
  select count(*) into n from public.documents where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B documents'; end if;
  select count(*) into n from public.domain_events where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B domain events'; end if;
  select count(*) into n from public.support_tickets where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: company A reads company B support tickets'; end if;

  reset role;
  raise notice 'ALL CANONICAL LIFECYCLE RLS CHECKS PASSED';
end;
$$;

rollback;
