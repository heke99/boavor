export type ListingType = 'rent' | 'sale'
export type SavedSearchMode = 'all' | 'rent' | 'sale'
export type AccountType = 'private' | 'company'
export type PreferredListingIntent = 'rent' | 'buy' | 'both'

export type ListingSegment = 'residential' | 'commercial' | 'parking' | 'storage' | 'land' | 'investment'
export type ListingCategory = 'all' | ListingSegment | 'office'
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'property'
  | 'commercial_space'
  | 'office'
  | 'parking_space'
  | 'garage'
  | 'storage_unit'
  | 'land_plot'
  | 'investment_property'
export type CommercialType = 'office' | 'retail' | 'restaurant' | 'warehouse' | 'industrial' | 'showroom' | 'clinic' | 'workshop' | 'other'
export type ParkingType = 'outdoor' | 'garage' | 'ev_charging' | 'motorcycle' | 'truck' | 'other'
export type StorageType = 'storage_unit' | 'warehouse_box' | 'mini_warehouse' | 'pallet_space' | 'container' | 'other'
export type LandType = 'land_plot' | 'industrial_land' | 'agricultural_land' | 'development_land' | 'yard_space' | 'other'
export type InvestmentType = 'rental_property' | 'commercial_property' | 'mixed_use_property' | 'portfolio' | 'project_property' | 'other'
export type InquiryStatus = 'new' | 'contacted' | 'viewing_booked' | 'negotiating' | 'closed' | 'rejected'
export type InquiryType = 'interest' | 'viewing' | 'offer_request' | 'contact'

export type AppRole =
  | 'seeker'
  | 'buyer'
  | 'landlord'
  | 'broker'
  | 'company_admin'
  | 'admin'
  | 'super_admin'

export type ListingStatus = 'draft' | 'published' | 'paused' | 'rented' | 'sold' | 'archived'
export type RentalApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'screening'
  | 'qualified'
  | 'not_qualified'
  | 'reviewing'
  | 'shortlisted'
  | 'viewing_invited'
  | 'viewing_booked'
  | 'offered'
  | 'offer_accepted'
  | 'contract_pending'
  | 'signed'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'rented_to_other'
  // Legacy values from the original live enum (normalized by the status machine)
  | 'received'
  | 'reserve'
  | 'viewing'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'trialing'

export type CompanyType =
  | 'landlord_company'
  | 'brokerage'
  | 'housing_association'
  | 'property_owner'
  | 'private_landlord'
  | 'other'

export type LegalForm = 'ab' | 'enskild_firma' | 'hb' | 'kb' | 'private_person' | 'ideell_forening' | 'privatperson' | 'other'

export type ListingCardItem = {
  id: string
  slug: string
  title: string
  city: string
  areaName: string
  listingType: ListingType
  listingSegment: ListingSegment
  propertyType: PropertyType
  status: ListingStatus
  price: number
  rooms: number
  areaSqm: number
  imageUrl: string
  badge?: string
  availableFrom?: string | null
  features: string[]
  commercialType?: CommercialType | null
  parkingType?: ParkingType | null
  storageType?: StorageType | null
  landType?: LandType | null
  investmentType?: InvestmentType | null
  isVatApplicable?: boolean
  monthlyServiceFee?: number | null
  pricePerSqm?: number | null
  minLeaseMonths?: number | null
  businessPurpose?: string | null
  annualIncome?: number | null
  operatingCost?: number | null
  capRate?: number | null
  unitsCount?: number | null
  occupancyRate?: number | null
  vacancyRate?: number | null
  isVerified?: boolean
  isStudentHousing?: boolean
  isSeniorHousing?: boolean
  isShortTerm?: boolean
  hasAccessibility?: boolean
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
  applicationDeadline: string | null
  viewingInfo: string | null
  policySummary: string | null
  hideExactAddress: boolean
  showApplicantCount: boolean
  images: Array<{
    id: string
    imageUrl: string
    altText: string | null
    isCover: boolean
    position: number
  }>
  rentalRequirements: {
    minIncome: number | null
    petsAllowed: boolean
    smokingAllowed: boolean
    referencesRequired: boolean
    employmentRequired: boolean
  } | null
}

export type SearchFilters = {
  mode?: ListingType
  category?: ListingCategory
  segment?: ListingSegment
  city?: string
  maxPrice?: string
  minArea?: string
  maxArea?: string
  availableFrom?: string
  propertyType?: PropertyType
  commercialType?: CommercialType
  parkingType?: ParkingType
  storageType?: StorageType
  landType?: LandType
  investmentType?: InvestmentType
  rooms?: string
  minRooms?: string
  hasBalcony?: string
  hasElevator?: string
  hasParking?: string
  petsAllowed?: string
  isVatApplicable?: string
  minLeaseMonths?: string
  workplaces?: string
  meetingRooms?: string
  isFurnished?: string
  hasReception?: string
  access247?: string
  hasEvCharger?: string
  isGarage?: string
  hasCameraSurveillance?: string
  maxVehicleHeightCm?: string
  isHeated?: string
  hasLoadingZone?: string
  hasElevatorAccess?: string
  hasDetailPlan?: string
  hasBuildingRights?: string
  hasWaterSewer?: string
  hasElectricity?: string
  hasRoadAccess?: string
  minLandArea?: string
  minUnits?: string
  minNoi?: string
  minCapRate?: string
  minOccupancyRate?: string
  maxVacancyRate?: string
  student?: string
  senior?: string
  shortTerm?: string
  accessibility?: string
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'area_desc'
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

export type CoApplicantInviteStatus = 'none' | 'invited' | 'accepted' | 'declined'

export type CoApplicantItem = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  relationship: string | null
  createdAt: string
  inviteStatus?: CoApplicantInviteStatus
  inviteToken?: string | null
  consentedAt?: string | null
}

export type GuarantorItem = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  relationship: string | null
  monthlyIncome: number | null
  createdAt: string
}

export type ProfileDocumentStatus = 'active' | 'expired' | 'replaced' | 'rejected' | 'pending_review'

export type ProfileDocumentItem = {
  id: string
  fileName: string
  fileUrl: string
  documentType: string
  documentStatus?: ProfileDocumentStatus
  documentExpiresAt?: string | null
  isDefaultForApplications?: boolean
  rejectionReason?: string | null
  createdAt: string
}

export type QueueMembershipItem = {
  id?: string
  status: 'active' | 'paused' | 'cancelled' | 'expired'
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
  accountType?: AccountType
  identityVerifiedAt?: string | null
  preferredListingIntent?: PreferredListingIntent
  termsAcceptedAt?: string | null
  privacyAcceptedAt?: string | null
  personalIdentityConsentAt?: string | null
  marketingConsent?: boolean
  city: string
  householdSize: number | null
  hasPets: boolean
  smoking?: boolean
  employmentStatus: string
  employerName: string
  monthlyIncome: number | null
  incomeType?: string | null
  studyStatus?: string | null
  currentHousingSituation?: string | null
  personalLetter?: string | null
  guarantorAvailable?: boolean
  desiredMoveIn: string | null
  desiredLocations: string[]
  coApplicants: CoApplicantItem[]
  guarantors?: GuarantorItem[]
  documents: ProfileDocumentItem[]
  queueMembership: QueueMembershipItem | null
  companies: CompanyMembershipItem[]
}

export type ProfileFormValues = {
  firstName: string
  lastName: string
  phone: string
  role: AppRole
  accountType?: AccountType
  preferredListingIntent?: PreferredListingIntent
  termsAcceptedAt?: string | null
  privacyAcceptedAt?: string | null
  personalIdentityConsentAt?: string | null
  marketingConsent?: boolean
  city: string
  householdSize: number | null
  hasPets: boolean
  employmentStatus: string
  employerName: string
  monthlyIncome: number | null
  desiredMoveIn: string | null
  desiredLocations: string[]
}

export type MatchkollResultValue = 'eligible' | 'likely_eligible' | 'missing_info' | 'not_eligible'

export type RentalApplicationItem = {
  id: string
  listingId?: string | null
  status: RentalApplicationStatus
  createdAt: string
  coverLetter: string | null
  queuePointsSnapshot: number
  queueJoinedAtSnapshot: string | null
  applicantsCountForListing?: number
  applicantScore?: number
  policyResult?: MatchkollResultValue | null
  randomRank?: number | null
  rejectionReason?: string | null
  history?: Array<{ fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>
  listing: {
    slug: string
    title: string
    city: string
    listingType: ListingType
    price: number
    imageUrl: string | null
  }
  applicant: {
    fullName: string
    email: string
    phone: string | null
    monthlyIncome: number | null
    householdSize: number | null
  }
  coApplicants: Array<{
    fullName: string
    email: string | null
    phone: string | null
    relationship: string | null
  }>
  documents: Array<{
    fileName: string
    fileUrl: string
    documentType: string
  }>
}

export type ManagedListingItem = {
  id: string
  slug: string
  title: string
  city: string
  listingType: ListingType
  listingSegment: ListingSegment
  propertyType: PropertyType
  commercialType?: CommercialType | null
  status: ListingStatus
  price: number
  rooms: number
  areaSqm: number
  createdAt: string
  applicationsCount: number
  inquiriesCount?: number
  updatedAt?: string | null
}

export type ListingActivityEventItem = {
  id: string
  eventType: string
  message: string | null
  payload: Record<string, unknown>
  createdAt: string
}

export type ListingInternalNoteItem = {
  id: string
  note: string
  createdAt: string
  createdBy: string | null
}

export type ListingRentalRequirementItem = {
  minIncome: number | null
  petsAllowed: boolean
  employmentRequired: boolean
  referencesRequired: boolean
}

export type SelectionMethodValue = 'strict_queue' | 'guided_queue' | 'first_come' | 'random' | 'manual_with_policy'

export type ManagedListingDetailItem = ManagedListingItem & {
  description: string | null
  street: string | null
  areaName: string | null
  availableFrom: string | null
  selectionMethod?: SelectionMethodValue
  applicationDeadlineAt?: string | null
  images: Array<{ id: string; imageUrl: string; altText: string | null; isCover: boolean; position: number }>
  applications: RentalApplicationItem[]
  inquiries: ListingInquiryItem[]
  internalNotes?: ListingInternalNoteItem[]
  activityEvents?: ListingActivityEventItem[]
}

export type ListingEditItem = ManagedListingDetailItem & {
  zipCode: string | null
  parkingType?: ParkingType | null
  storageType?: StorageType | null
  landType?: LandType | null
  investmentType?: InvestmentType | null
  businessPurpose?: string | null
  isVatApplicable?: boolean
  monthlyServiceFee?: number | null
  pricePerSqm?: number | null
  minLeaseMonths?: number | null
  annualIncome?: number | null
  operatingCost?: number | null
  capRate?: number | null
  unitsCount?: number | null
  coverImageUrl?: string | null
  features: string[]
  rentalRequirements: ListingRentalRequirementItem | null
  isStudentHousing?: boolean
  isSeniorHousing?: boolean
  isShortTerm?: boolean
  hasAccessibility?: boolean
  applicationDeadline?: string | null
  viewingInfo?: string | null
  policySummary?: string | null
  hideExactAddress?: boolean
  showApplicantCount?: boolean
}

export type ListingInquiryItem = {
  id: string
  listingId?: string | null
  status: InquiryStatus
  inquiryType: InquiryType
  createdAt: string
  message: string | null
  internalNote?: string | null
  preferredContactMethod: string | null
  requester: {
    fullName: string
    email: string
    phone: string | null
    companyName: string | null
  }
  listing: {
    slug: string
    title: string
    city: string
    listingType: ListingType
    listingSegment: ListingSegment
    price: number
  }
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