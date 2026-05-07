import { Heart } from 'lucide-react'
import { addFavoriteAction } from '@/app/actions/engagement'
import { Button } from '@/components/ui/Button'

export function FavoriteButton({ listingId, compact = false }: { listingId: string; compact?: boolean }) {
  return (
    <form action={addFavoriteAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <Button
        variant="ghost"
        className={compact ? 'border border-black/8 px-3 py-2 text-xs' : 'w-full border border-black/8'}
      >
        <Heart size={16} className={compact ? '' : 'mr-2'} />
        {compact ? 'Spara' : 'Spara som favorit'}
      </Button>
    </form>
  )
}
