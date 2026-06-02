# Bovaro

Marketplace för hyra och köp byggd med Next.js, TypeScript och Supabase.

## Starta

```bash
npm install
cp .env.example .env.local
npm run dev
```

## SQL
Kör SQL-filerna i Supabase SQL Editor i denna ordning för en komplett miljö:

1. `supabase/schema.sql`
2. `supabase/phase4_profile_queue.sql`
3. `supabase/phase10_12_13.sql`
4. `supabase/phase_register_system.sql`
5. `supabase/phase_commercial_marketplace.sql`
6. `supabase/phase_dynamic_search.sql`
7. `supabase/phase_dashboard_leads.sql`
8. `supabase/phase_dashboard_foundation.sql`
9. `supabase/phase_listing_detail_management.sql`
10. `supabase/phase_admin_dashboard.sql`
11. `supabase/phase_public_listing_flows.sql`
12. `supabase/phase_permissions_security_hardening.sql`
13. `supabase/production_go_live.sql`
14. `supabase/production_polish.sql`

`supabase/phase_demo_seed_data.sql` är endast för demo/staging och ska inte köras i produktion.

## Produktion

Minimikrav före go-live:

- sätt `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` och `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- konfigurera Supabase Auth redirect URLs för `/auth/callback`
- kör SQL-ordningen ovan och verifiera Storage-buckets `listing-images` och `profile-documents` samt readiness/rate-limit-funktioner
- aktivera CI: `npm run lint`, `npm run build`, `npm audit --omit=dev --audit-level=moderate`
- konfigurera e-post, betalning, monitoring och rate limit enligt `.env.example`
- verifiera `/api/health`, `/robots.txt` och `/sitemap.xml` efter deploy

## Fasstatus i denna leverans
Detta paket täcker Bovaro upp till produktionsförberedande fas:

- publik startsida
- hero search
- hyra/köp-listor
- listing detail-sidor
- auth-sidor
- dashboard
- profil
- favoriter
- sparade sökningar
- annonsörsgrund
- Supabase-schema + RLS
- auth callback, session middleware och lösenordsåterställning
- Supabase Storage för annonsbilder och profildokument
- SEO metadata, sitemap, robots, JSON-LD, security headers, health/readiness endpoints och admin systemvy
