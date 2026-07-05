/**
 * Saved-search matching logic (pure, unit-tested). Used by the scheduled job
 * that notifies users about new listings.
 */

export type SavedSearchCriteria = {
  mode: 'rent' | 'sale' | 'all'
  city: string | null
  propertyType: string | null
  minRooms: number | null
  maxPrice: number | null
}

export type MatchableListing = {
  listingType: 'rent' | 'sale'
  city: string
  areaName: string | null
  propertyType: string
  rooms: number | null
  price: number
}

export function listingMatchesSavedSearch(search: SavedSearchCriteria, listing: MatchableListing): boolean {
  if (search.mode !== 'all' && listing.listingType !== search.mode) return false

  if (search.city) {
    const needle = search.city.trim().toLowerCase()
    if (needle) {
      const haystacks = [listing.city, listing.areaName ?? ''].map((value) => value.toLowerCase())
      if (!haystacks.some((value) => value.includes(needle))) return false
    }
  }

  if (search.propertyType && listing.propertyType !== search.propertyType) return false

  if (search.minRooms !== null && (listing.rooms === null || listing.rooms < search.minRooms)) return false

  if (search.maxPrice !== null && listing.price > search.maxPrice) return false

  return true
}
