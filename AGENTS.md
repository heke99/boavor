<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Multi-repo workspace root: `/agent/repos/`. This app lives at `/agent/repos/boavor` (package name `bovaro`).

- **Install:** `npm install` in this directory.
- **Env:** Copy `.env.example` to `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Apply SQL files under `supabase/` to a Supabase project (see `README.md`). A fake Supabase host causes slow home-page loads (~10s) while fetches time out; pages still render with empty listing data.
- **Dev:** `npm run dev`. Use `PORT` when multiple Next apps run together.
- **Lint / build:** `npm run build` works with env set. `npm run lint` (`next lint`) may error on Next 16 with “Invalid project directory …/lint”; use project ESLint config directly if you need lint until the script is updated.
- **Tests:** No `test` script in `package.json`.
