import { LegalPage } from '@/components/ui/LegalPage'
import { getLegalDocument } from '@/lib/legal/versions'

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookiepolicy"
      description="Denna policy förklarar hur Bovaro använder cookies och liknande tekniker."
      updatedAt={getLegalDocument('cookies').version}
      sections={[
        {
          title: 'Vad cookies är',
          body: ['Cookies är små filer som sparas i webbläsaren för att webbplatsen ska fungera, komma ihåg val och förbättra upplevelsen.'],
        },
        {
          title: 'Typer av cookies',
          body: ['Bovaro kan använda nödvändiga cookies för inloggning och säkerhet, funktionscookies för sparade val, analyscookies för förbättring och marknadsföringscookies om detta aktiveras senare.'],
        },
        {
          title: 'Samtycke',
          body: ['Nödvändiga cookies kan användas för att tjänsten ska fungera. Övriga cookies bör kräva samtycke innan de används.'],
        },
        {
          title: 'Ändra val',
          body: ['Användaren ska kunna ändra cookieinställningar via webbplatsen när cookiehantering är aktiverad.'],
        },
      ]}
    />
  )
}
