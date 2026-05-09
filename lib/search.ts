import { SearchFilters } from '@/lib/types'
import { mockListings } from '@/lib/mock-data'

export function filterListings(filters: SearchFilters) {
  return mockListings.filter((listing) => {
    if (filters.mode && listing.listingType !== filters.mode) return false
    if (filters.city && !`${listing.city} ${listing.areaName}`.toLowerCase().includes(filters.city.toLowerCase())) return false
    if (filters.rooms && listing.rooms < Number(filters.rooms)) return false
    if (filters.maxPrice && listing.price > Number(filters.maxPrice)) return false
    if (filters.propertyType && listing.propertyType !== filters.propertyType) return false
    if (filters.segment && listing.listingSegment !== filters.segment) return false
    if (filters.category && filters.category !== 'all') {
      if (filters.category === 'office') {
        if (!(listing.listingSegment === 'commercial' && listing.commercialType === 'office')) return false
      } else if (filters.category === 'commercial') {
        if (!(listing.listingSegment === 'commercial' && listing.commercialType !== 'office')) return false
      } else if (listing.listingSegment !== filters.category) return false
    }
    if (filters.commercialType && listing.commercialType !== filters.commercialType) return false
    return true
  })
}

export function getListingBySlug(slug: string) {
  return mockListings.find((listing) => listing.slug === slug) ?? null
}
