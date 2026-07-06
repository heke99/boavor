# Konkurrenskraft och lanseringsläge

> Sammanfattning efter Batch 0–26. Uppdateras inför varje större release.

## Positionering

Bovaro kombinerar tre saker som konkurrenterna håller isär:

1. **Kostnadsfri, transparent bostadskö** (mot HomeQ/Boplats betalmodeller) —
   1 poäng/dag, ledger-baserad och granskningsbar, nollställs vid signerat kontrakt.
2. **Komplett SaaS för hyresvärdar** (mot annons-tavlorna) — fastigheter/enheter,
   policyer med Matchkoll, pipeline, visningar, erbjudanden, kontrakt, analys,
   import, API/webhooks och white-label-portaler i samma system.
3. **Förtroende som produkt** — BankID-redo identitet, personnummer endast som
   hash, deltagarlåst meddelandesystem (admin kräver motiverad, tidsbegränsad
   supportåtkomst), GDPR-självservice och publik RLS-matris.

## Funktionsjämförelse (sammandrag)

| Kapabilitet | Bovaro | Typisk konkurrent |
| --- | --- | --- |
| Kostnadsfri kö med poäng | Ja | Ofta betalvägg eller kommunal begränsning |
| Återanvändbar ansökningsprofil + dokument | Ja | Delvis |
| Krav-förkontroll (Matchkoll) före ansökan | Ja | Nej |
| Hyresvärds-pipeline med urvalsmetoder | Ja (kötid/match/slump, auditerbar) | Enkel inbox |
| Digitala kontrakt + e-signering | Ja (adapter, mock i staging) | Sällan |
| Bostadsbyte (Byta) | Ja, verifierade användare | Separata nischtjänster |
| Externa köer samlade | Ja (manuell spårning, utan inloggningsdelning) | Nej |
| Publikt API + signerade webhooks | Ja | Nej |
| White-label-portal per hyresvärd | Ja (egen domän stöds) | Sällan |
| PWA + push | Ja | Delvis |

## Kända begränsningar före skarp lansering

- BankID, e-signering, screening och Resend kräver riktiga avtal/nycklar —
  utan dem visas ärliga "inte konfigurerad"-lägen (mock endast utanför produktion).
- Juridiska texter är strukturerade grundversioner; jurist ska granska före lansering.
- CSP körs i report-only tills inline-källor inventerats.
- Kartvyer saknas (geokodning finns som adapter; karta är nästa steg).
- Meddelandebilagor virusskannas inte ännu (typ-/storleksbegränsade).

## Slutlig smoke-testlista (manuell, före varje release)

Kör gärna `npm run test:e2e` först (28 automatiska tester), därefter manuellt:

1. **Registrering** privatperson → bekräftelsemail → inloggad på dashboard.
2. **Identitet**: verifiera (mock/BankID) → checklistan grönmarkeras.
3. **Kö**: gå med → poäng visas; `award-queue-points` ger +1 nästa dag.
4. **Sök & bevakning**: filtrera på stad, spara bevakning, få mejl vid ny matchande annons.
5. **Ansökan**: Matchkoll → ansök → syns i hyresvärdens pipeline med kösnapshot.
6. **Hyresvärd**: skapa annons från enhet, begär komplettering, kalla till visning,
   skicka erbjudande, skapa kontrakt, mock-signera → köpoäng nollställs.
7. **Meddelanden**: tråd öppnas vid ansökan; deltagare kan skriva; admin kan INTE
   läsa utan supportåtkomst (verifiera i /admin/support).
8. **Byta**: skapa bytesannons (kräver verifiering), intresse → ömsesidig matchning → tråd.
9. **Billing**: köp Plus i Stripe testläge → entitlements uppdateras → kundportal fungerar.
10. **Support**: skapa ärende som användare → svara som admin (SLA-badge) → notis till användaren.
11. **GDPR**: ladda ner egen data (JSON), skicka raderingsbegäran → syns i /admin/privacy.
12. **Ops**: /admin/ops visar gröna cron-körningar; slå på underhållsläge → banner + blockerad ansökan; stäng av.
13. **API**: skapa nyckel → `GET /api/v1/ping` → 200 med scopes; utan nyckel → 401.
14. **Portal**: aktivera hyresgästportal → /p/slug visar företagets publicerade objekt.
15. **Mobil**: bottennavigering, ansökningsflöde och meddelanden på 390 px-vy.
16. **PWA**: installera appen, gå offline → offline-sidan visas.

## Mätpunkter efter lansering

- `analytics_daily`: registreringar, kömedlemskap (`events.queue_joined`),
  ansökningar, sök→ansökan-konvertering.
- `/admin/sales`: leads från ROI-kalkylen och demobokningar.
- `cron_run_logs` + `integration_failures`: driftshälsa.
- Sentry: felfrekvens per route.
