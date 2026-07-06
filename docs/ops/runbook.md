# Driftrunbook (ops)

> Operativ dokumentation för Bovaro. Dashboard: `/admin/ops`.

## Schemalagda jobb (Vercel Cron)

Alla jobb kräver `Authorization: Bearer $CRON_SECRET` och loggar till
`cron_run_logs` (running → success/failed). Alla är idempotenta.

| Jobb | Schema | Gör |
| --- | --- | --- |
| `award-queue-points` | 03:15 dagligen | Delar ut köpoäng (1/dag) via ledger. |
| `saved-search-matching` | varje timme | Matchar nya annonser mot bevakningar + mejl. |
| `publish-scheduled-listings` | var 15:e min | Publicerar schemalagda annonser. |
| `unread-message-reminders` | var 30:e min | Mejl + push för olästa meddelanden. |
| `expire-offers` | 5 min över varje timme | Låter erbjudanden förfalla. |
| `external-queue-reminders` | 06:30 dagligen | Förnyelsepåminnelser för externa köer. |
| `weekly-digest` | måndagar 07:00 | Veckosammanfattning. |
| `analytics-rollup` | 02:45 dagligen | Aggregerar gårdagens händelser till `analytics_daily`. |
| `webhook-deliveries` | var 5:e min | Levererar signerade webhooks med backoff. |

**Manuell körning:** `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/<jobb>`
(analytics-rollup accepterar `?day=YYYY-MM-DD` för omkörning av en dag).

## Integrationsfel

`integration_failures` fylls på av koden när externa tjänster fallerar:

- **resend** — e-postleverans misslyckades (`email_events` har detaljer).
- **webhook** — en utgående webhook dödbrevlådades efter 5 försök.

Åtgärd: undersök grundorsaken (mottagarens endpoint, API-nyckel, kvot),
åtgärda och markera som löst i `/admin/ops`. Döda webhook-leveranser kan
köras om med "Försök igen" (återköas direkt).

## Vanliga fellägen

| Symptom | Trolig orsak | Åtgärd |
| --- | --- | --- |
| Cron-jobb failed med "SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad" | Saknad env i Vercel | Lägg till nyckeln, kör om jobbet manuellt. |
| Alla cron-jobb 401 | `CRON_SECRET` roterad men inte uppdaterad i Vercel Cron | Uppdatera env; Vercel Cron skickar alltid aktuell env. |
| E-post skickas inte, `email_events.status = failed` | Resend-nyckel/domän | Kontrollera Resend-dashboarden; failure-raden pekar på mall. |
| Webhooks dödbrevlådas för samma endpoint | Mottagarens server nere/fel secret | Kontakta integratören; pausa endpointen under tiden. |
| Push levereras inte | VAPID-nycklar saknas | Utan nycklar skickas inget (medvetet); generera med `npx web-push generate-vapid-keys`. |

## Incidenter

Registrera incidenter i `/admin/ops` (rubrik, allvarlighetsgrad, beskrivning).
Flöde: **Pågående → Övervakas → Löst**. Alla statusändringar auditloggas.
Vid kritisk incident: aktivera underhållsläget och kommunicera via bannern.

## Underhållsläge

- Slås på/av i `/admin/ops` (endast superadmin; ändringen auditloggas).
- Effekt: sajtövergripande banner + nya bostadsansökningar blockeras med
  tydligt meddelande. Läsning fungerar som vanligt.
- Inställningen är `platform_settings.maintenance_mode` (publik nyckel).

## Övervakning

- **Sentry**: serverfel rapporteras automatiskt när `SENTRY_DSN` är satt
  (PII maskeras innan sändning).
- **Cron-hälsa**: `/admin/ops` visar de senaste körningarna; ett jobb som
  saknas i listan har inte triggats — kontrollera Vercel Cron.
- **RLS-regression**: kör `supabase/tests/rls_checks.sql` efter schemaändringar.
