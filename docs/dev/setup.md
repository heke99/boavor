# Local development setup

## Prerequisites

- Node.js 22 (matches CI)
- npm 10+
- A Supabase project (or the shared staging project)

## 1. Install

```bash
npm ci
```

## 2. Environment

```bash
cp .env.example .env.local
```

Required for the app to talk to the database:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Everything else is optional. Modules whose env vars are missing render a clear
"inte konfigurerad" state instead of failing or faking success. See the
comments in `.env.example` for what each variable does.

Without any Supabase env vars the app still builds and runs, but all pages show
empty states.

## 3. Database

Apply the migrations in `supabase/migrations/` in order (see
`supabase/migrations/README.md`). For a fresh project:

1. Run `00000000000000_baseline.sql` (creates schema, RLS, storage buckets, seeds).
2. Run every later migration in timestamp order.

Options:

- Supabase SQL editor (paste each file), or
- `supabase db push` with the CLI linked to your project, or
- the Supabase MCP `apply_migration` tool.

Never run anything from `supabase/archive/` — those are deprecated legacy
scripts kept for reference.

## 4. Type generation

After changing the schema, regenerate the database types:

```bash
npx supabase gen types typescript --project-id <project-id> --schema public > lib/supabase/database.types.ts
```

Keep the header comment at the top of the file intact.

## 5. Run

```bash
npm run dev
```

## 6. Quality checks (run before every commit)

```bash
npm run lint
npm test
npm run build
```

CI (`.github/workflows/ci.yml`) runs the same three plus
`npm audit --omit=dev --audit-level=moderate`.

## 7. Auth redirect URLs

In the Supabase dashboard (Authentication → URL configuration) add:

- `http://localhost:3000/auth/callback` (development)
- `https://<your-domain>/auth/callback` (production)

## 8. Storage buckets

Created by the baseline migration: `listing-images` (public) and
`profile-documents` (private). Verify via `/api/readiness` once the app runs.
