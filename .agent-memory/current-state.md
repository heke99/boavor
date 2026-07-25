# Current state

The repository already contained marketplace, applicant, landlord, admin,
viewing, offer, contract, SaaS billing, support and integration foundations.
The 2026-07-25 lifecycle delivery adds the previously absent post-contract
domain and tenant portal without replacing existing canonical objects.

TypeScript, lint, 208 unit tests and the production build pass. The remaining
verification is migration/cross-company execution against PostgreSQL and full
browser E2E with Chromium plus seeded Supabase accounts.
