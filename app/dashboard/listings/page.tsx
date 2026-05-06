import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { mockListings } from '@/lib/mock-data'
import { Button } from '@/components/ui/Button'

export default function DashboardListingsPage() {
  return (
    <DashboardShell activePath="/dashboard/listings" title="Mina objekt" description="Grund för annonsörsportal och framtida listing management.">
      <div className="flex justify-end">
        <Button>Skapa nytt objekt</Button>
      </div>
      <ListingGrid listings={mockListings.slice(0, 3)} />
    </DashboardShell>
  )
}
