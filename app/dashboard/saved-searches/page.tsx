import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getSavedSearches } from '@/lib/data/engagement'
import { deleteSavedSearchAction, saveSearchAction, toggleSavedSearchNotificationsAction } from '@/app/actions/engagement'

export default async function DashboardSavedSearchesPage() {
  const result = await getSavedSearches()

  if (!result.isSignedIn) {
    redirect('/login')
  }

  return (
    <DashboardShell activePath="/dashboard/saved-searches" title="Sparade sökningar" description="Byggt för bevakningar och notiser när nya objekt matchar.">
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Spara en ny sökning</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Spara filterkombinationer och slå på notiser så att Bovaro kan bevaka marknaden åt dig.</p>

        <form action={saveSearchAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input name="title" placeholder="Titel, t.ex. Hyra Stockholm 2 rok" />
          <Select name="mode" defaultValue="all">
            <option value="all">Alla</option>
            <option value="rent">Hyra</option>
            <option value="sale">Till salu</option>
          </Select>
          <Input name="city" placeholder="Stad" />
          <Select name="propertyType" defaultValue="">
            <option value="">Alla bostadstyper</option>
            <option value="apartment">Lägenhet</option>
            <option value="house">Hus</option>
            <option value="property">Fastighet</option>
          </Select>
          <Input name="minRooms" type="number" min={0} step="0.5" placeholder="Min antal rum" />
          <Input name="maxPrice" type="number" min={0} placeholder="Maxpris / maxhyra" />
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
            <input type="checkbox" name="notificationsEnabled" defaultChecked />
            Aktivera mailnotiser
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <Button>Spara sökning</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {result.searches.length === 0 ? (
          <Card className="p-10 text-center lg:col-span-2">
            <h2 className="text-2xl font-semibold">Inga sparade sökningar ännu</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              När du sparar en sökning här kan vi senare koppla in bevakningar och automatiska notiser på riktigt.
            </p>
          </Card>
        ) : (
          result.searches.map((search) => (
            <Card key={search.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)] inline-flex">
                    {search.mode === 'all' ? 'Alla objekt' : search.mode === 'rent' ? 'Hyra' : 'Till salu'}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{search.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {search.city || 'Alla städer'} • {search.propertyType || 'Alla typer'} • minst {search.minRooms ?? 0} rum • max {search.maxPrice ?? '—'}
                  </p>
                </div>
                <div className="rounded-full px-3 py-1 text-xs font-semibold text-[#8a6000] bg-[var(--accent-soft)]">
                  {search.notificationsEnabled ? 'Mailnotiser på' : 'Notiser av'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <form action={toggleSavedSearchNotificationsAction}>
                  <input type="hidden" name="id" value={search.id} />
                  <input type="hidden" name="nextValue" value={String(!search.notificationsEnabled)} />
                  <Button variant="ghost" className="border border-black/8">
                    {search.notificationsEnabled ? 'Stäng av notiser' : 'Aktivera notiser'}
                  </Button>
                </form>
                <form action={deleteSavedSearchAction}>
                  <input type="hidden" name="id" value={search.id} />
                  <Button variant="secondary">Ta bort</Button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
