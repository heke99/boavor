import { LandlordShell } from '@/components/landlord/LandlordShell'
import { ModulePlaceholder } from '@/components/landlord/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default function LandlordViewingsPage() {
  return (
    <LandlordShell
      activePath="/landlord/viewings"
      title="Visningar"
      description="Visningstider, inbjudningar och närvaro."
    >
      <ModulePlaceholder
        title="Visningsmodulen är inte aktiverad ännu"
        description="Visningstider med inbjudningar och bekräftelser byggs just nu. Tills dess kan du markera ansökningar som 'Inbjuden till visning' i urvalsflödet, så bekräftar den sökande via sin ansökan."
      />
    </LandlordShell>
  )
}
