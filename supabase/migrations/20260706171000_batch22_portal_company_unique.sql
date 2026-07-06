-- One portal per company (the UI upserts on company_id). Safe to re-run.
create unique index if not exists tenant_portals_company_unique
  on public.tenant_portals (company_id);
