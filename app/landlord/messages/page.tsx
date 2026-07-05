import { LandlordShell } from '@/components/landlord/LandlordShell'
import { ModulePlaceholder } from '@/components/landlord/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default function LandlordMessagesPage() {
  return (
    <LandlordShell
      activePath="/landlord/messages"
      title="Meddelanden"
      description="Säker kommunikation med sökande direkt i plattformen."
    >
      <ModulePlaceholder
        title="Meddelandemodulen är inte aktiverad ännu"
        description="Trådar per ansökan, bilagor och svarsfrister byggs just nu. Tills dess kan du använda kompletteringsbegäran på respektive ansökan — den skickar en notis till den sökande."
      />
    </LandlordShell>
  )
}
