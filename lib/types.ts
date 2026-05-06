export type ListingType = 'rent' | 'sale'
export type PropertyType = 'apartment' | 'house' | 'property'

export type ListingCardItem = {
  id: string
  slug: string
  title: string
  city: string
  areaName: string
  listingType: ListingType
  propertyType: PropertyType
  price: number
  rooms: number
  areaSqm: number
  imageUrl: string
  badge?: string
  availableFrom?: string
  features: string[]
}

export type SearchFilters = {
  mode?: ListingType
  city?: string
  rooms?: string
  maxPrice?: string
  propertyType?: string
}
