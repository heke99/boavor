import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { FavoriteEmptyState } from '@/components/dashboard/FavoriteEmptyState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getDashboardFavorites } from '@/lib/data/engagement'
import { formatCurrency } from '@/lib/utils'
import { removeFavoriteAction } from '@/app/actions/engagement'

export default async function DashboardFavoritesPage() {
  const result = await getDashboardFavorites()

  if (!result.isSignedIn) {
    redirect('/login')
  }

  return (
    <DashboardShell activePath="/dashboard/favorites" title="Favoriter" description="Objekt du har sparat för att jämföra, följa upp och gå tillbaka till senare.">
      {result.favorites.length === 0 ? (
        <FavoriteEmptyState />
      ) : (
        <div className="space-y-4">
          {result.favorites.map((favorite) => {
            const listing = favorite.listing
            return (
              <Card key={favorite.id} className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {listing.listingType === 'rent' ? 'Hyra' : 'Till salu'}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold">{listing.title}</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">{listing.areaName}, {listing.city}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listing.features.map((feature) => (
                        <span key={feature} className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-[var(--muted)]">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-[260px] rounded-[24px] bg-[var(--surface)] p-5">
                    <div className="text-2xl font-semibold text-[var(--primary)]">
                      {formatCurrency(listing.price, listing.listingType === 'rent' ? 'rent' : 'sale')}
                    </div>
                    <div className="mt-2 text-sm text-[var(--muted)]">
                      {listing.rooms} rum • {listing.areaSqm} m²
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button href={`/listing/${listing.slug}`}>Visa objekt</Button>
                      <form action={removeFavoriteAction}>
                        <input type="hidden" name="favoriteId" value={favorite.id} />
                        <Button variant="ghost" className="border border-black/8">Ta bort</Button>
                      </form>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
