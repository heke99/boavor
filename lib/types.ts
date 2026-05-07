export type ListingType = 'rent' | 'sale'
export type PropertyType = 'apartment' | 'house' | 'property'
export type ListingStatus = 'draft' | 'published' | 'paused' | 'rented' | 'sold' | 'archived'
export type SavedSearchMode = 'rent' | 'sale' | 'all'
export type AppRole = 'seeker' | 'buyer' | 'landlord' | 'broker' | 'company_admin' | 'admin' | 'super_admin'
export type CompanyType =
  | 'private_landlord'
  | 'landlord_company'
  | 'brokerage'
  | 'housing_association'
  | 'property_owner'
  | 'other'
export type LegalForm = 'ab' | 'enskild_firma' | 'hb' | 'kb' | 'ideell_forening' | 'privatperson' | 'other'
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
export type QueueMembershipStatus = 'inactive' | 'active' | 'paused' | 'cancelled' | 'expired'
export type SubscriptionStatus = 'pending' | 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired'

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

export type CoApplicantItem = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  relationship: string | null
  createdAt: string
}

export type ProfileDocumentItem = {
  id: string
  fileName: string
  fileUrl: string
  documentType: string
  createdAt: string
}

export type QueueMembershipItem = {
  id: string
  status: QueueMembershipStatus
  joinedQueueAt: string
  currentPoints: number
  monthsInQueue: number
  nextBillingAt: string | null
  subscriptionStatus: SubscriptionStatus | null
}

export type CompanyMembershipItem = {
  companyId: string
  name: string
  slug: string
  companyType: CompanyType
  legalForm: LegalForm
  memberRole: AppRole
}

export type DashboardProfileItem = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: AppRole
  city: string
  householdSize: number | null
  hasPets: boolean
  employmentStatus: string
  employerName: string
  monthlyIncome: number | null
  desiredMoveIn: string | null
  desiredLocations: string[]
  coApplicants: CoApplicantItem[]
  documents: ProfileDocumentItem[]
  queueMembership: QueueMembershipItem | null
  companies: CompanyMembershipItem[]
}

export type FavoriteItem = {
  id: string
  createdAt: string
  listing: ListingCardItem
}

export type SavedSearchItem = {
  id: string
  title: string
  mode: SavedSearchMode
  city: string | null
  propertyType: PropertyType | null
  minRooms: number | null
  maxPrice: number | null
  notificationsEnabled: boolean
  createdAt: string
}
