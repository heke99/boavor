# Bovaro

Marketplace för hyra och köp byggd med Next.js, TypeScript och Supabase.

## Starta

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Databas

Schemat hanteras via ordnade migrationsfiler i `supabase/migrations/` — se
`supabase/migrations/README.md` för index, regler och bootstrap-instruktioner.

De gamla fas-filerna är arkiverade i `supabase/archive/` och får inte köras.

Efter varje migration, regenerera databastyperna:

```bash
npx supabase gen types typescript --project-id <project-id> --schema public > lib/supabase/database.types.ts
```

## Produktion

Minimikrav före go-live:

- sätt `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` och `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- sätt server-hemligheterna `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RATE_LIMIT_SECRET` och `IDENTITY_HASH_SECRET` (krävs i produktion; utan `RATE_LIMIT_SECRET` nekas rate-limitade åtgärder)
- konfigurera Supabase Auth redirect URLs för `/auth/callback`
- kör migrationerna i `supabase/migrations/` och verifiera Storage-buckets `listing-images`, `profile-documents` och `message-attachments` samt readiness/rate-limit-funktioner
- aktivera CI: `npm run lint`, `npm run build`, `npm audit --omit=dev --audit-level=moderate`
- konfigurera e-post, betalning, monitoring och rate limit enligt `.env.example`
- verifiera `/api/health`, `/api/readiness`, `/robots.txt` och `/sitemap.xml` efter deploy

Fullständig checklista: `docs/go-live.md`.

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
