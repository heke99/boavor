# Go-live-checklista för Bovaro

> Utvecklardokument (engelska/svenska blandat medvetet: rubriker för svensk
> driftpersonal, tekniska värden som de heter i respektive tjänst).

## 1. Miljö och hemligheter (Vercel)

| Variabel | Krävs | Anteckning |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Från Supabase-projektets API-inställningar. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Endast server; krävs av cron, webhooks och sökandekonto-flöden. |
| `CRON_SECRET` | Ja | Slumpad sträng; Vercel Cron skickar den som Bearer-token. |
| `RATE_LIMIT_SECRET` | Ja | Hashar rate-limit-subjekt (IP/användare). |
| `IDENTITY_HASH_SECRET` | Ja | HMAC för personnummer-hash. Byt ALDRIG efter lansering. |
| `RESEND_API_KEY` + `EMAIL_FROM` | Ja | Verifiera avsändardomänen i Resend först. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Ja för betalflöden | Server-side Checkout (ingen publishable key behövs). Skapa produkter/priser, koppla webhook → `/api/webhooks/stripe`. |
| `BANKID_*` | Ja för skarp identifiering | RP-certifikat krävs; utan dem visas mock endast i icke-produktion. |
| `ESIGN_*` | Ja för skarp signering | Utan konfig visas "inte konfigurerad" — aldrig fejkad signering. |
| `SENTRY_DSN` | Rekommenderas | Serverfel rapporteras via instrumentation-hooken. |
| `GEOCODING_*` | Valfritt | Nominatim-kompatibel endpoint för koordinater. |

## 2. Supabase

- [ ] Alla migrationer i `supabase/migrations/` är applicerade (`supabase_migrations.schema_migrations` matchar filerna).
- [ ] `supabase/tests/rls_checks.sql` körd mot produktionsprojektet — slutar med `ALL RLS CHECKS PASSED`.
- [ ] Auth: e-postbekräftelse PÅ, säkra lösenordskrav, rätt site-URL + redirect-URL:er (`/auth/callback`).
- [ ] Storage-buckets finns: `profile-documents`, `message-attachments` (privata) — verifiera storlek/MIME-begränsningar.
- [ ] Första super_admin: sätt `profiles.role = 'super_admin'` via SQL-editorn för grundarkontot.
- [ ] Punkt-in-time-backup aktiverad.

## 3. Vercel

- [ ] Cron-schemat i `vercel.json` aktivt (9 jobb). Verifiera första körningarna i `/admin/system` (cron_run_logs).
- [ ] Security headers svarar (CSP report-only initialt — följ upp rapporter innan enforcing).
- [ ] Egen domän + HTTPS, `NEXT_PUBLIC_SITE_URL` satt.

## 4. Stripe

- [ ] Produkter/priser skapade och kopplade i `/admin/billing` (planer aktiverade).
- [ ] Webhook-endpoint `POST /api/webhooks/stripe` med rätt signeringssecret; testa med Stripe CLI.
- [ ] Kundportalen aktiverad i Stripe-dashboarden.

## 5. E-post (Resend)

- [ ] Domän verifierad (SPF/DKIM), `EMAIL_FROM` matchar domänen.
- [ ] Testa: registrera konto → bekräftelsemail; skapa bevakning → matchningsmail (cron).

## 6. Verifieringar innan öppning

- [ ] `npm run lint`, `npm test`, `npm run build` gröna på main.
- [ ] `npm run test:e2e` – publika smoke + auth-guards gröna mot produktion (`E2E_BASE_URL=https://…`).
- [ ] Seedade E2E-konton BORTTAGNA ur produktionsdatabasen (eller aldrig skapade där).
- [ ] Manuell rök-test: registrering → identitet (mock/BankID) → köanslutning → ansökan → hyresvärdens pipeline → meddelande → erbjudande → kontrakt (mock-signering i staging).
- [ ] `/admin` nås endast av admin; supportläge kräver motivering; granskningsloggen fylls på.
- [ ] Juridiska sidor granskade av jurist; versioner i `lib/legal/versions.ts` uppdaterade vid ändring.

## 7. Efter lansering

- [ ] Övervaka `/admin/system` (cron-körningar, rate limits) och Sentry dagligen första veckan.
- [ ] Kontrollera `analytics_daily` efter första rollup-natten.
- [ ] GDPR-ärenden: bemanna `/admin/privacy`; ledtid < 30 dagar enligt förordningen.

## Manualer

- Sökande: `docs/manuals/seeker.md`
- Hyresvärd: `docs/manuals/landlord.md`
- Admin: `docs/manuals/admin.md`
