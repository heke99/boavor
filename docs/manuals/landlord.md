# Manual: Hyresvärd

## Kom igång

1. **Skapa företagskonto** på `/register` (företag) eller uppgradera via `/landlord/onboarding`.
2. **Verifiering**: företaget granskas av Bovaro innan full publicering. Status syns i arbetsytan.
3. **Team**: bjud in kollegor under `Inställningar → Team` med roller (ägare, förvaltare, uthyrare, läsare).

## Fastigheter och annonser

- `Arbetsytan → Fastigheter`: registrera fastigheter, byggnader och lägenheter (enheter).
  CSV-import finns för större bestånd.
- `Arbetsytan → Annonser`: skapa annonser från enheter eller fristående. Schemalagd
  publicering stöds. Krav (inkomst, anmärkningar, husdjur m.m.) anges per annons.
- **Uthyrningspolicyer**: versionerade policyer under `Policyer` styr Matchkoll och
  för-screening. Publicerade annonser visar kraven öppet — inga dolda kriterier.

## Ansökningar (pipeline)

- `Arbetsytan → Ansökningar`: kanban över inkommande ansökningar med kövärde,
  Matchkoll-resultat och dokumentstatus.
- Urvalsmetod väljs per annons: kötid, bäst match eller slumpvis (auditerbar).
- Statusändringar loggas och notifierar den sökande automatiskt. Begär komplettering,
  kalla till visning, skicka erbjudande — allt från pipelinen.
- Avslag kräver orsak (intern + valfri extern motivering).

## Visningar, erbjudanden, kontrakt

- **Visningar**: skapa tider (slots) och bjud in utvalda sökande; svar samlas per tid.
- **Erbjudanden**: tidsbegränsade; förfaller automatiskt via schemalagt jobb.
- **Kontrakt**: bygg på versionerade mallar; innehållet fryses vid utskick. Signering
  sker via e-signeringsleverantör (i staging en tydligt märkt mock). Vid slutförd
  signering nollställs den sökandes köpoäng automatiskt.

## Meddelanden

- All kommunikation med sökande sker i plattformens trådar (koppling till ansökan).
- Trådar kan låsas eller få svarsdeadline. Bilagor virusskannas ej i staging — endast
  jpg/png/pdf tillåts, max 30 MB.
- Bovaros administratörer kan INTE läsa era trådar utan en tidsbegränsad, motiverad
  supportåtkomst som loggas.

## Analys och fakturering

- `Arbetsytan → Analys`: visningar, ansökningar och konvertering per annons (aggregerat,
  aldrig enskilda besökare), CSV-export.
- `Arbetsytan → Fakturering`: planer och betalning via Stripe kundportal.
