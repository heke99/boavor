import { getListingBySlug as getPublishedListingBySlug, getPublishedListings } from '@/lib/data/listings'
import type { SearchFilters } from '@/lib/types'

export async function filterListings(filters: SearchFilters) {
  return getPublishedListings(filters)
}

export async function getListingBySlug(slug: string) {
  return getPublishedListingBySlug(slug)
}
