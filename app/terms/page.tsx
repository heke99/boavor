import { LegalPage } from '@/components/ui/LegalPage'
import { getLegalDocument } from '@/lib/legal/versions'

export default function TermsPage() {
  return (
    <LegalPage
      title="Allmänna villkor"
      description="Dessa villkor reglerar användningen av Bovaro för privatpersoner och företag. Texten är en tydlig grundversion och bör granskas juridiskt innan skarp lansering."
      updatedAt={getLegalDocument('terms').version}
      sections={[
        {
          title: 'Om Bovaro',
          body: [
            'Bovaro är en digital bostadsplattform där privatpersoner och företag kan söka, spara, publicera och hantera bostadsobjekt. Plattformen kan innehålla hyresobjekt, bostäder till salu, bevakningar, ansökningar, köpoäng och kommunikation mellan användare och annonsörer.',
          ],
        },
        {
          title: 'Kontotyper',
          body: [
            'Bovaro erbjuder konton för privatpersoner och företag. Privatpersoner kan söka, köpa, hyra, spara objekt och senare publicera egna bostadsobjekt. Företag kan publicera och hantera bostadsobjekt professionellt.',
            'Admin- och superadmin-konton skapas inte genom öppen registrering utan hanteras separat av Bovaro.',
          ],
        },
        {
          title: 'Registrering och uppgifter',
          body: [
            'Användaren ansvarar för att information som lämnas vid registrering är korrekt, aktuell och inte vilseledande. Det är inte tillåtet att skapa konto med falsk identitet, felaktigt personnummer, falskt organisationsnummer eller utan rätt att företräda ett företag.',
          ],
        },
        {
          title: 'Personnummer',
          body: [
            'Privatpersoner anger personnummer för identifiering, profilhantering och bostadsansökningar. Personnummer behandlas enligt Bovaros integritetspolicy och ska inte exponeras mer än nödvändigt.',
          ],
        },
        {
          title: 'Företagskonton',
          body: [
            'Företag ansvarar för att organisationsnummer, kontaktperson, företagsuppgifter och publicerade objekt är korrekta. Bovaro får begära kompletterande information för att verifiera företaget och kan begränsa publicering innan verifiering är klar.',
          ],
        },
        {
          title: 'Publicering av bostäder',
          body: [
            'Den som publicerar bostäder ansvarar för att ha rätt att annonsera objektet och att informationen är korrekt. Det är förbjudet att publicera falska, vilseledande eller diskriminerande annonser.',
            'Bovaro får granska, pausa eller ta bort annonser som bryter mot villkoren, misstänks vara falska eller riskerar att skada användare eller plattformens trovärdighet.',
          ],
        },
        {
          title: 'Ansökningar och kontakt',
          body: [
            'En ansökan eller intresseanmälan via Bovaro innebär inte rätt till bostad. Annonsören ansvarar för urval, kontakt och beslut. Bovaro är normalt inte part i hyresavtal, köpeavtal eller förmedlingsavtal mellan användare och annonsörer.',
          ],
        },
        {
          title: 'Köpoäng',
          body: [
            'Bovaro kan erbjuda köpoäng eller kömedlemskap. Köpoäng är en extra merit och är inte en garanti för bostad. Annonsörer kan väga in flera faktorer vid urval.',
          ],
        },
        {
          title: 'Otillåten användning',
          body: [
            'Det är förbjudet att använda falska uppgifter, skapa bluffannonser, utge sig för att vara någon annan, samla in andra användares uppgifter utan tillåtelse, kringgå säkerhetsfunktioner eller använda plattformen för bedrägeri, spam eller diskriminering.',
          ],
        },
        {
          title: 'Avstängning och begränsning',
          body: [
            'Bovaro får pausa, begränsa eller stänga av konton som bryter mot villkoren, misstänks användas för bedrägeri eller skadar andra användare.',
          ],
        },
        {
          title: 'Ansvarsbegränsning',
          body: [
            'Bovaro ansvarar inte för att en användare får en bostad, att en annons leder till avtal eller att information från en annonsör alltid är fullständig. Bovaro ska dock arbeta för att plattformen är tydlig, säker och seriös.',
          ],
        },
        {
          title: 'Ändringar och kontakt',
          body: [
            'Bovaro får uppdatera tjänsten och villkoren. Väsentliga ändringar ska kommuniceras tydligt. Frågor skickas via support eller angiven kontaktadress på webbplatsen.',
          ],
        },
      ]}
    />
  )
}
