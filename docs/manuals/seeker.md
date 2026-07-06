# Manual: Bostadssökande

## Kom igång

1. **Skapa konto** på `/register` (privatperson). Bekräfta e-postadressen via länken.
2. **Verifiera din identitet** under `Dashboard → Identitet`. I produktion används BankID;
   i test-/utvecklingsmiljö finns en tydligt märkt mock. Verifiering + 18 år krävs för att ansöka.
3. **Ställ dig i kön** via `/bostadsko` — kostnadsfritt, 1 poäng per dag i kön.

## Profil och dokument

- `Dashboard → Min profil`: hushåll, inkomst, anställning, boendehistorik. Mätaren
  "Ansökningsredo" visar vad som saknas.
- `Dashboard → Dokument`: ladda upp intyg (anställning, inkomst, referenser). Dokument
  granskas och kan få utgångsdatum — förnya i tid.
- **Medsökande**: bjud in via e-post; medsökanden godkänner själv innan de kan väljas i ansökningar.

## Söka bostad

- Sök på `/listings` eller `/rent`; spara bevakningar för att få mejl vid nya träffar.
- **Matchkoll** på annonssidan visar om du uppfyller hyresvärdens grundkrav innan du ansöker.
- Ansök via annonsens ansökningsknapp. Din profil frystes som en ögonblicksbild vid inskick —
  senare profiländringar påverkar inte redan skickade ansökningar.
- Antal samtidiga aktiva ansökningar är begränsat (5 utan Plus). Återkalla en ansökan för att frigöra en plats.

## Efter ansökan

- Följ status under `Dashboard → Ansökningar` (mottagen → granskas → utvald → erbjudande).
- Kommunikation sker i `Dashboard → Meddelanden` — svara inom angiven svarstid om en deadline satts.
- Visningsinbjudningar och erbjudanden besvaras direkt i respektive flöde.
- Vid signerat kontrakt nollställs dina köpoäng (du börjar om i kön).

## Bovaro Byta och externa köer

- `/byta`: lägg upp din nuvarande hyresrätt och ange önskemål. Namn och exakt adress
  visas först vid ömsesidigt intresse.
- `Dashboard → Alla mina köer`: samla dina externa bostadsköer (HomeQ, Boplats m.fl.)
  med förnyelsepåminnelser. Bovaro lagrar aldrig dina inloggningsuppgifter till andra köer.

## Integritet

- `Dashboard → Inställningar`: e-postnotiser, lösenord, nedladdning av dina uppgifter (JSON)
  och GDPR-begäranden (rättelse, begränsning, radering).
