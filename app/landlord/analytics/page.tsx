import { LandlordShell } from '@/components/landlord/LandlordShell'
import { ModulePlaceholder } from '@/components/landlord/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default function LandlordAnalyticsPage() {
  return (
    <LandlordShell
      activePath="/landlord/analytics"
      title="Analys"
      description="Visningar, ansökningar, konvertering och tid till uthyrning."
    >
      <ModulePlaceholder
        title="Analysmodulen är inte aktiverad ännu"
        description="Detaljerad statistik per annons och område byggs just nu. Grundsiffror (aktiva annonser, ansökningar, kvalificerade sökande) finns redan på översikten."
      />
    </LandlordShell>
  )
}
