import type { AreaHighlight, ListingType, StatItem } from '@/lib/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AreaListingRow = {
  city: string
}

type StatsListingRow = {
  id: string
  listing_type: ListingType
}

const CITY_DESCRIPTIONS: Record<string, string> = {
  Stockholm: 'Premiumområden, citynära hyresrätter och attraktiva bostäder till salu.',
  Göteborg: 'Starka citylägen, snabba pendlingsstråk och välbyggda områden.',
  Malmö: 'Hög efterfrågan, modern produktion och stark tillväxt.',
  Uppsala: 'Universitetsstad med stabil efterfrågan och smidiga pendlingslägen.',
  Helsingborg: 'Kustnära lägen, stark inflyttning och premiumsegment i tillväxt.',
  Linköping: 'Teknikstad med växande bostadsmarknad och familjevänliga områden.',
}

export async function getAreaHighlights(): Promise<AreaHighlight[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase.from('listings').select('city').eq('status', 'published')
  if (error) {
    console.error('Failed to fetch area highlights', error)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as AreaListingRow[]) {
    counts.set(row.city, (counts.get(row.city) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      count: `${count}+ objekt`,
      description: CITY_DESCRIPTIONS[name] ?? 'Aktiv marknad med både hyresobjekt och bostäder till salu.',
    }))
}

export async function getStats(): Promise<StatItem[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase.from('listings').select('id, listing_type').eq('status', 'published')
  if (error) {
    console.error('Failed to fetch stats', error)
    return []
  }

  const rows = (data ?? []) as StatsListingRow[]
  const total = rows.length
  const rent = rows.filter((row) => row.listing_type === 'rent').length
  const sale = rows.filter((row) => row.listing_type === 'sale').length

  return [
    { value: `${total}+`, label: 'Aktiva objekt' },
    { value: `${rent}`, label: 'Hyresobjekt' },
    { value: `${sale}`, label: 'Till salu' },
    { value: 'Redo', label: 'Databasmodell fas 3' },
  ]
}