# RLS-matris (Row Level Security)

> Uppdaterad i Batch 17. Källan är alltid `pg_policies` i den skarpa databasen;
> denna fil är en läsbar sammanfattning per domän. Alla tabeller i `public`
> har RLS aktiverat. Skrivningar som saknar policy går endast via
> `SECURITY DEFINER`-funktioner eller service-rollen (cron/webhooks).

Roller i matrisen:

- **Anon** – utloggad besökare (anon-nyckeln).
- **User** – inloggad användare (`authenticated`), åtkomst till egna rader.
- **Owner** – annons-/företagsägare via `current_user_can_manage_listing()` / medlemskap i `company_members`.
- **Admin** – `profiles.role in ('admin','super_admin')` via `current_user_is_admin()`.
- **Super** – endast `super_admin` via `current_user_is_super_admin()`.
- **Service** – service-rollen (cron, webhooks); kringgår RLS per definition.

## Konto och identitet

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `profiles` | – | läs/uppdatera egen, skapa egen | – | läs alla; endast Super uppdaterar andra | Rolländringar valideras dessutom av DB-trigger. |
| `identity_verifications` | – | läs/starta egna | – | endast Super läser alla | PIN lagras aldrig i klartext, endast hash. |
| `identity_verification_events` | – | läs/skriv egna (append-only) | – | läs alla | Ingen update/delete-policy: händelser är oföränderliga. |
| `user_consents` | – | läs/skapa/återkalla egna | – | läs alla | |
| `user_risk_flags` | – | **ingen åtkomst** | – | läs/skapa/åtgärda | Internt: användare ser aldrig sina riskflaggor. |
| `legal_acceptances` | – | läs/skapa egna | – | – | Unik per (user, dokument, version). |
| `admin_user_invites` | – | – | – | hantera alla | |

## Annonser och marknadsplats

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `listings` | läs publicerade | läs publicerade | läs/skapa/uppdatera egna | läs/uppdatera alla | |
| `listing_images` / `listing_features` / `listing_documents` | läs för publicerade | läs för publicerade | hantera egna | via owner-policy | |
| `rental_requirements` | läs för publicerade | läs för publicerade | hantera egna | – | |
| `listing_inquiries` | skapa | skapa; läs egna | läs/uppdatera inkommande | läs/uppdatera alla | |
| `listing_activity_events` | – | – | läs/skriv för egna annonser | läs/skriv alla | Auditspår för annonsändringar. |
| `listing_internal_notes` | – | – | läs/skriv egna | läs alla | |
| `listing_publications` | – | – | läs/skriv egna | läs alla | Schemalagd publicering. |
| `favorites` / `saved_searches` | – | hantera egna | – | – | Strikt användarisolering. |
| `saved_search_matches` / `saved_search_notification_runs` | – | läs egna | – | läs/hantera | Skrivs av cron (service). |
| `sale_leads` | skapa | – | läs/uppdatera behöriga | via policy | Legacy-tabell från köpsidan. |
| `campaigns` | läs aktiva inom tidsfönster | läs aktiva | – | hantera alla | |

## Bostadskö

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `queue_memberships` | – | hantera egen | – | läs alla | Poäng ändras via ledger + definer-funktioner. |
| `queue_point_ledger` | – | läs/skriv egen | – | läs alla | Cron skriver dagliga poäng via service. |
| `external_queue_providers` | läs aktiva | läs aktiva | – | hantera | |
| `external_queue_memberships` / `external_queue_reminders` / `external_queue_events` | – | hantera/läsa egna | – | – | Inga inloggningsuppgifter lagras. |

## Ansökningar och urval

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `rental_applications` | – | skapa/läs egna | läs/uppdatera inkommande | läs alla | Statusövergångar valideras i statusmaskinen server-side. |
| `rental_application_status_history` | – | läs egna | läs/skriv för sina annonser | – | Append-only. |
| `rental_application_co_applicants` / `rental_application_documents` | – | skapa/läs egna | – (läser via snapshot) | läs alla | |
| `application_profile_snapshots` | – | skapa/läs egna | läs för inkommande | – | Oföränderlig bild av profilen vid ansökan. |
| `application_policy_results` | – | skapa/läs egna | läs för inkommande | läs alla | Matchkoll-resultat per ansökan. |
| `landlord_policies` / `policy_rules` | läs för publicerade annonser | läs för publicerade | hantera egna | läs alla | Versionerade; regler fryses per utvärdering. |
| `policy_evaluations` | – | skapa/läs egna | läs för sina annonser | läs alla | |
| `co_applicants` | – | hantera egna; inbjudna läser sin länk | – | – | |
| `guarantors` | – | hantera egna | – | läs | |
| `profile_documents` | – | hantera egna | – | – | Delning sker via ansökningsdokument. |
| `document_reviews` | – | läs för egna dokument | – | hantera | |
| `document_access_logs` | – | läs egna; skriv | – | läs alla | Vem som öppnat vilket dokument. |

## Fastigheter och team (hyresvärd)

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `companies` | – | skapa | medlemmar läser/uppdaterar | läs/uppdatera alla | Verifiering endast via admin. |
| `company_members` | – | läs/hantera egna medlemskap | managers läser/uppdaterar/tar bort | läs alla | |
| `company_member_invites` | – | – | hantera | – | Tokenbaserade inbjudningar. |
| `properties` / `buildings` / `units` / `unit_media` / `unit_documents` | – | – | hantera egna | via owner-policy | |

## Meddelanden

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `message_threads` | – | deltagare läser; landlord/support uppdaterar | – | **endast med aktiv supportåtkomst (läs)** | Ingen generell admininsyn — kräver motiverad, tidsbegränsad grant. |
| `message_participants` | – | deltagare läser; egen rad uppdateras | – | endast med grant (läs) | |
| `messages` | – | deltagare läser/skickar (lås-regler) | – | endast med grant (läs); **kan aldrig skriva** | |
| `message_attachments` | – | deltagare läser; avsändare bifogar | – | endast med grant (läs) | Privat bucket, 30 MB, begränsade MIME-typer. |
| `message_events` | – | deltagare läser/loggar | – | endast med grant (läs) | |
| `support_access_grants` | – | – | – | läs alla; skapa egna; återkalla | Motivering ≥ 10 tecken; expiry obligatorisk; allt auditloggas. |

## Visningar, erbjudanden och kontrakt

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `viewing_slots` | – | inbjudna läser | hantera egna | – | |
| `viewing_invitations` | – | läs/svara på egna | hantera | – | |
| `rental_offers` | – | läs/svara på egna | hantera egna | – | Utgång via cron. |
| `rental_offer_events` | – | parter läser/loggar | parter | – | |
| `contract_templates` | – | läs plattformsmallar | företag hanterar olåsta egna | – | Versionslåsning vid användning. |
| `contracts` | – | signatärer läser | hantera egna | – | Innehållssnapshot är oföränderligt. |
| `contract_signers` / `contract_events` | – | signatärer läser | hantera | – | Signering via definer-funktion + webhook. |
| `viewings` (legacy) | – | behöriga | behöriga | – | Ersatt av slots-modellen. |

## Byta (bostadsbyte)

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `exchange_profiles` | – | verifierade läser aktiva; äger sin egen | – | läs/uppdatera (moderering) | Namn/adress döljs tills ömsesidig matchning. |
| `exchange_interests` | – | parter läser | – | – | Skrivs via `register_exchange_interest()` (definer). |
| `exchange_matches` | – | parter läser/uppdaterar | – | läs | Skapas atomiskt vid ömsesidigt intresse. |
| `exchange_reports` | – | verifierade anmäler | – | hantera | ≥ 3 unika anmälare ⇒ automatisk riskflagga (trigger). |

## Betalningar

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `subscription_plans` | läs aktiva | läs aktiva | – | Super hanterar | |
| `user_subscriptions` | – | hantera egna | – | hantera alla | Stripe-status skrivs av webhook (service). |
| `company_subscriptions` | – | – | medlemmar läser | hantera | |
| `billing_customers` | – | läs egen | – | läs alla | Endast Stripe-id:n, inga kortuppgifter. |
| `billing_events` | – | – | – | läs | Idempotensnyckel för webhooken. |

## Notifieringar, analys och drift

| Tabell | Anon | User | Owner | Admin | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `notifications` | – | läs/uppdatera egna; skapa egna | – | skapa | |
| `notification_preferences` | – | hantera egna | – | – | |
| `email_events` | – | – | – | läs | Skrivs av e-postutskick (service). |
| `analytics_events` | – | **ingen läsning** | läs händelser för egna annonser | läs alla | Insert endast via `track_analytics_event()` (whitelist, definer). |
| `analytics_daily` | – | – | – | läs | Skrivs av rollup-cron (service). |
| `cron_run_logs` | – | – | – | läs | |
| `rate_limit_events` | – | – | – | läs | Endast hashade subjekt lagras. |
| `admin_audit_logs` | – | – | – | läs/skriv | Append-only. |
| `privacy_requests` | – | skapa/läs egna | – | uppdatera (status) | Workflow i `/admin/privacy`. |
| `platform_settings` | läs publika | läs publika | – | läs alla; Super skriver | |

## Testning

- Körbar RLS-kontroll: `supabase/tests/rls_checks.sql` (idempotent, rullar alltid tillbaka).
  Kör via `psql` mot en miljö med baslinje + migrationer, eller via Supabase SQL-editorn.
- Kontrollerna täcker: anon-isolering, användarisolering, supportlägets livscykel,
  analytics-whitelisten och publika/interna plattformsinställningar.
