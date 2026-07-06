# Manual: Plattformsadmin

> Adminpanelen nås på `/admin` och kräver rollen `admin` eller `super_admin`.
> Roller tilldelas endast av super_admin (eller via service-rollen). Alla känsliga
> åtgärder skrivs till granskningsloggen (`/admin/system`).

## Daglig drift

| Yta | Användning |
| --- | --- |
| `/admin` | Översikt: användare, företag, annonser, ansökningar, leads. |
| `/admin/system` | Granskningslogg, integritetsärenden, rate limits, dokumentåtkomst, cron-körningar. |
| `/admin/analytics` | Dagliga aggregat + händelser senaste 7 dagarna, CSV-export. |

## Användare och företag

- `/admin/users`: sök/filtrera; endast super_admin ändrar roller. Invites skapar en
  förregistrering som kopplas vid kontoskapande.
- `/admin/companies`: verifiera företag (org.nr-kontroll görs manuellt). Ange alltid
  verifieringsnotering vid avslag.
- `/admin/identity`: granska identitetsverifieringar och dubblettflaggor.

## Moderering

- `/admin/listings`: pausa/arkivera annonser som bryter mot villkoren (statusändring loggas
  och syns i annonsens aktivitetshistorik).
- `/admin/byta`: anmälningar mot bytesannonser; "Ta bort annonsen" avpublicerar direkt.
- `/admin/risk`: riskflaggor — automatiska (dubblettidentitet, ≥3 unika anmälningar) och
  manuella. Flaggor är interna och visas aldrig för användaren.

## Supportläge (viktigt)

Admins har **ingen** stående insyn i användarnas meddelanden och kan aldrig agera som
en användare (ingen impersonering).

1. Gå till `/admin/support`, välj konversation (endast metadata visas).
2. Ange motivering (minst 10 tecken) och giltighetstid (max enligt plattformsinställning).
3. Läsvyn öppnas; varje öppning granskningsloggas. Skrivning är tekniskt blockerad (RLS).
4. Återkalla åtkomsten när ärendet är löst — annars upphör den automatiskt.

## GDPR

- `/admin/privacy`: handlägg registerutdrag, rättelse, begränsning, radering.
  - Registerutdrag: användaren kan själv ladda ner JSON via inställningarna; komplettera
    manuellt vid behov.
  - Radering: ta bort auth-kontot i Supabase (cascade rensar användardata) och markera
    ärendet slutfört. Ledtid enligt GDPR: 30 dagar.

## Plattformsinställningar

- `/admin/settings` (endast super_admin skriver): underhållsläge, maxtid för supportåtkomst,
  tröskel för automatiska riskflaggor. Värden är JSON och ändringar loggas.

## Kampanjer och fakturering

- `/admin/campaigns`: kampanjblock på startsidan/hyressidan/dashboarden med tidsfönster.
- `/admin/billing`: planer, aktivering och manuella prenumerationsgrants (loggas).
