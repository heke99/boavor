import { LegalPage } from '@/components/ui/LegalPage'
import { getLegalDocument } from '@/lib/legal/versions'

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Integritetspolicy"
      description="Här beskriver Bovaro hur personuppgifter behandlas för konto, bostadssökning, annonser, ansökningar, köpoäng, support och säkerhet."
      updatedAt={getLegalDocument('privacy').version}
      sections={[
        {
          title: 'Syfte',
          body: [
            'Bovaro behandlar personuppgifter för att kunna tillhandahålla konton, bostadssökning, annonser, ansökningar, bevakningar, köpoäng, support och säkerhet.',
          ],
        },
        {
          title: 'Uppgifter för privatpersoner',
          body: [
            'Bovaro kan behandla namn, personnummer, e-post, telefonnummer, stad, bostadsintresse, ansökningsuppgifter, köpoäng, köhistorik, favoriter, bevakningar och dokument som användaren själv laddar upp.',
          ],
        },
        {
          title: 'Uppgifter för företag',
          body: [
            'Bovaro kan behandla företagsnamn, organisationsnummer, företagsmejl, telefonnummer, kontaktperson, roll, publicerade objekt och verifieringsstatus.',
          ],
        },
        {
          title: 'Personnummer',
          body: [
            'Personnummer behandlas för identifiering, säkerhet och bostadsansökningar. Personnummer ska inte visas publikt och ska endast delas i relevanta bostadsflöden där det behövs.',
          ],
        },
        {
          title: 'Rättslig grund',
          body: [
            'Bovaro kan behandla uppgifter baserat på avtal, samtycke, berättigat intresse eller rättslig förpliktelse. Samtycke kan användas för marknadsföring och särskild behandling som uttryckligen godkänns av användaren.',
          ],
        },
        {
          title: 'Delning av uppgifter',
          body: [
            'Bovaro kan dela uppgifter med annonsörer när användaren skickar ansökan eller intresseanmälan, med tekniska leverantörer för drift, databas, e-post och betalning, samt med myndigheter om lag kräver det.',
          ],
        },
        {
          title: 'Lagringstid',
          body: [
            'Bovaro sparar uppgifter så länge kontot är aktivt eller så länge uppgifterna behövs för tjänsten. Ansökningar, loggar och betalningsrelaterad information kan behöva sparas längre av säkerhets-, bevis- eller bokföringsskäl.',
          ],
        },
        {
          title: 'Rättigheter',
          body: [
            'Användaren kan begära information om behandlingen och kan i vissa fall begära rättelse, radering, begränsning eller invända mot behandling. Begäran görs via Bovaros kontaktvägar.',
          ],
        },
        {
          title: 'Säkerhet',
          body: [
            'Bovaro ska använda tekniska och organisatoriska skyddsåtgärder för att skydda personuppgifter, särskilt personnummer, ansökningsdata och dokument.',
          ],
        },
      ]}
    />
  )
}
