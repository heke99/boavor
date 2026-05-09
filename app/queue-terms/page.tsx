import { LegalPage } from '@/components/ui/LegalPage'

export default function QueueTermsPage() {
  return (
    <LegalPage
      title="Villkor för Bovaro Kö+"
      description="Villkor för köpoäng och eventuellt betalt kömedlemskap på Bovaro."
      updatedAt="2026-05-09"
      sections={[
        {
          title: 'Vad Bovaro Kö+ är',
          body: ['Bovaro Kö+ är en tjänst där privatpersoner kan samla köpoäng som kan visas som extra merit i bostadsansökningar.'],
        },
        {
          title: 'Ingen garanti',
          body: ['Köpoäng garanterar inte bostad. Annonsörer kan väga in flera faktorer vid urval.'],
        },
        {
          title: 'Poäng',
          body: ['Poäng kan tilldelas månadsvis eller enligt Bovaros gällande modell. Bovaro kan justera poäng vid missbruk, tekniska fel eller regeländringar.'],
        },
        {
          title: 'Betalning',
          body: ['Om Bovaro Kö+ är en betald tjänst ska pris, period och uppsägning visas tydligt innan köp.'],
        },
        {
          title: 'Uppsägning och missbruk',
          body: ['Användaren ska kunna säga upp tjänsten enligt villkoren. Bovaro kan pausa eller ta bort köpoäng vid bedrägeri, falska uppgifter eller otillåten användning.'],
        },
      ]}
    />
  )
}
