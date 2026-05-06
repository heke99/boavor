import { Heart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function FavoriteEmptyState() {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[#ad6d00]">
        <Heart size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Inga favoriter ännu</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
        Spara objekt du gillar för att jämföra snabbare och hålla koll på marknaden.
      </p>
      <div className="mt-6">
        <Button href="/listings">Utforska objekt</Button>
      </div>
    </Card>
  )
}
