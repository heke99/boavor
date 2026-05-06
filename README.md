# Bovaro

Marketplace för hyra och köp byggd med Next.js, TypeScript och Supabase.

## Starta

```bash
npm install
cp .env.example .env.local
npm run dev
```

## SQL
Kör SQL-filen i `supabase/schema.sql` i Supabase SQL Editor.

## Fasstatus i denna leverans
Detta paket täcker Bovaro upp till och med fas 9:

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
