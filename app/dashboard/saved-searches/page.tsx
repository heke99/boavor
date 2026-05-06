import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { SavedSearchCards } from '@/components/dashboard/SavedSearchCard'

export default function DashboardSavedSearchesPage() {
  return (
    <DashboardShell activePath="/dashboard/saved-searches" title="Sparade sökningar" description="Byggt för bevakningar och notiser när nya objekt matchar.">
      <SavedSearchCards />
    </DashboardShell>
  )
}
