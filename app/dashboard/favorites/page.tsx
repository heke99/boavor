import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { FavoriteEmptyState } from '@/components/dashboard/FavoriteEmptyState'

export default function DashboardFavoritesPage() {
  return (
    <DashboardShell activePath="/dashboard/favorites" title="Favoriter" description="Samla objekt du gillar och gå tillbaka till dem senare.">
      <FavoriteEmptyState />
    </DashboardShell>
  )
}
