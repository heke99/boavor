export type ListingType = 'rent' | 'sale'
export type PropertyType = 'apartment' | 'house' | 'property'
export type ListingStatus = 'draft' | 'published' | 'paused' | 'rented' | 'sold' | 'archived'
export type SavedSearchMode = 'rent' | 'sale' | 'all'
export type RentalApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'received'
  | 'reviewing'
  | 'qualified'
  | 'reserve'
  | 'viewing'
  | 'offered'
  | 'rejected'
  | 'signed'

export type SaleLeadStatus = 'new' | 'contacted' | 'viewing_booked' | 'follow_up' | 'closed'

export type SearchFilters = {
  mode?: ListingType
  city?: string
  rooms?: string
  maxPrice?: string
  propertyType?: string
}

export type ListingCardItem = {
  id: string
  slug: string
  title: string
  city: string
  areaName: string
  listingType: ListingType
  propertyType: PropertyType
  status: ListingStatus
  price: number
  rooms: number
  areaSqm: number
  imageUrl: string
  badge?: string
  availableFrom?: string | null
  features: string[]
  isVerified?: boolean
}

export type RentalRequirements = {
  minIncome: number | null
  petsAllowed: boolean
  smokingAllowed: boolean
  referencesRequired: boolean
  employmentRequired: boolean
}

export type ListingDetailItem = ListingCardItem & {
  description: string
  street: string | null
  zipCode: string | null
  country: string | null
  floor: string | null
  buildYear: number | null
  monthlyFee: number | null
  latitude: number | null
  longitude: number | null
  images: Array<{
    id: string
    imageUrl: string
    altText: string | null
    isCover: boolean
    position: number
  }>
  rentalRequirements: RentalRequirements | null
}

export type AreaHighlight = {
  name: string
  count: string
  description: string
}

export type StatItem = {
  value: string
  label: string
}
