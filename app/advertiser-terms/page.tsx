import { LegalPage } from '@/components/ui/LegalPage'

export default function AdvertiserTermsPage() {
  return (
    <LegalPage
      title="Annonsörsvillkor"
      description="Villkor för privatpersoner och företag som publicerar bostadsobjekt på Bovaro."
      updatedAt="2026-05-09"
      sections={[
        {
          title: 'Vem som omfattas',
          body: ['Annonsörsvillkoren gäller för privatpersoner och företag som publicerar bostadsobjekt på Bovaro.'],
        },
        {
          title: 'Rätt att annonsera',
          body: ['Annonsören intygar att den har rätt att publicera objektet och att informationen är korrekt, aktuell och inte vilseledande.'],
        },
        {
          title: 'Annonsens innehåll',
          body: ['Annonsen ska innehålla korrekta uppgifter om bostaden, pris, hyra, avgifter, läge, storlek, villkor, bilder och tillgänglighet.'],
        },
        {
          title: 'Förbjudet innehåll',
          body: ['Det är förbjudet att publicera falska objekt, objekt utan rätt att annonsera, vilseledande priser, diskriminerande krav, bedrägliga kontaktuppgifter eller bilder som annonsören saknar rätt att använda.'],
        },
        {
          title: 'Ansökningar och urval',
          body: ['Annonsören ansvarar för hur ansökningar behandlas och för att urval sker på ett seriöst och lagligt sätt.'],
        },
        {
          title: 'Bovaros rättigheter',
          body: ['Bovaro får granska, pausa eller ta bort annonser som bryter mot villkor, misstänks vara falska eller riskerar att skada användare.'],
        },
        {
          title: 'Företagsverifiering',
          body: ['Företag kan behöva verifieras innan de får publicera fritt. Verifiering kan omfatta organisationsnummer, kontaktperson och behörighet att företräda företaget.'],
        },
      ]}
    />
  )
}
