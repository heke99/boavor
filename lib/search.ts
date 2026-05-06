import { SearchFilters } from '@/lib/types'
import { mockListings } from '@/lib/mock-data'

export function filterListings(filters: SearchFilters) {
  return mockListings.filter((listing) => {
    if (filters.mode && listing.listingType !== filters.mode) return false
    if (filters.city && !listing.city.toLowerCase().includes(filters.city.toLowerCase())) return false
    if (filters.rooms && listing.rooms < Number(filters.rooms)) return false
    if (filters.maxPrice && listing.price > Number(filters.maxPrice)) return false
    if (filters.propertyType && listing.propertyType !== filters.propertyType) return false
    return true
  })
}

export function getListingBySlug(slug: string) {
  return mockListings.find((listing) => listing.slug === slug) ?? null
}
