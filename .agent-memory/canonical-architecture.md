# Canonical architecture

- Identity: Supabase Auth + `profiles`
- Tenant: `companies`; membership: `company_members`
- Inventory: `properties` → `buildings` → `units`
- Marketplace: `listings`
- Application: `rental_applications` + immutable snapshots
- Contract: `contracts` linked to canonical `documents`/`document_versions`
- Resident relation: `tenancies` + `occupancies`
- Money: `rent_*` tables in integer öre, separate from SaaS billing
- Service: `maintenance_cases` → `work_orders`
- Exit: `lease_terminations` → `move_out_cases`
- Integration: `domain_events` → `outbox_events` → channel adapters

Business transitions are database commands/RPCs. UI, server actions and APIs
delegate to the same commands.

