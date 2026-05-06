import { SearchCheck, BellRing } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const searches = [
  { title: 'Hyra · Stockholm · 2+ rum', description: 'Max 15 000 kr / mån · Lägenhet', notifications: 'Aktiv bevakning' },
  { title: 'Till salu · Göteborg', description: 'Max 4 000 000 kr · Lägenhet', notifications: 'Mailnotiser på' },
]

export function SavedSearchCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {searches.map((search) => (
        <Card key={search.title} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary)]">
                <SearchCheck size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{search.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{search.description}</p>
              </div>
            </div>
            <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[#a06d00]">
              {search.notifications}
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Button variant="ghost" className="border border-black/8">
              <BellRing size={16} className="mr-2" />
              Hantera
            </Button>
            <Button variant="secondary">Visa resultat</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
