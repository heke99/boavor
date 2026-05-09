import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  CommercialType,
  InvestmentType,
  LandType,
  ListingCardItem,
  ListingDetailItem,
  ListingSegment,
  ListingType,
  ParkingType,
  PropertyType,
  SearchFilters,
  StorageType,
} from '@/lib/types'
import { getDefaultPropertyType } from '@/lib/listing-options'

type ListingRow = {
  id: string
  slug: string
  title: string
  description: string | null
  listing_type: ListingType
  listing_purpose?: ListingType | null
  listing_segment?: ListingSegment | null
  property_type: PropertyType
  commercial_type?: CommercialType | null
  parking_type?: ParkingType | null
  storage_type?: StorageType | null
  land_type?: LandType | null
  investment_type?: InvestmentType | null
  business_purpose?: string | null
  is_vat_applicable?: boolean | null
  monthly_service_fee?: number | null
  price_per_sqm?: number | null
  min_lease_months?: number | null
  annual_income?: number | null
  operating_cost?: number | null
  cap_rate?: number | string | null
  units_count?: number | null
  occupancy_rate?: number | string | null
  vacancy_rate?: number | string | null
  has_balcony?: boolean | null
  has_elevator?: boolean | null
  has_parking?: boolean | null
  pets_allowed?: boolean | null
  workplaces?: number | null
  meeting_rooms?: number | null
  is_furnished?: boolean | null
  has_reception?: boolean | null
  access_24_7?: boolean | null
  has_ev_charger?: boolean | null
  is_garage?: boolean | null
  has_camera_surveillance?: boolean | null
  max_vehicle_height_cm?: number | null
  is_heated?: boolean | null
  has_loading_zone?: boolean | null
  has_elevator_access?: boolean | null
  has_detail_plan?: boolean | null
  has_building_rights?: boolean | null
  has_water_sewer?: boolean | null
  has_electricity?: boolean | null
  has_road_access?: boolean | null
  status: ListingDetailItem['status']
  street: string | null
  city: string
  zip_code: string | null
  country: string | null
  area_name: string | null
  latitude: number | string | null
  longitude: number | string | null
  price: number
  monthly_fee: number | null
  area_sqm: number | string | null
  rooms: number | string | null
  floor: string | null
  build_year: number | null
  available_from: string | null
  is_verified: boolean
  published_at: string | null
  created_by: string | null
  company_id: string | null
  created_at?: string | null
  listing_images?: Array<{
    id: string
    image_url: string
    alt_text: string | null
    position: number
    is_cover: boolean
  }>
  listing_features?: Array<{
    feature_label: string
  }>
  rental_requirements?: Array<{
    min_income: number | null
    pets_allowed: boolean
    smoking_allowed: boolean
    references_required: boolean
    employment_required: boolean
  }>
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function getListingSegment(row: ListingRow): ListingSegment {
  if (row.listing_segment) return row.listing_segment
  if (['commercial_space', 'office'].includes(row.property_type)) return 'commercial'
  if (['parking_space', 'garage'].includes(row.property_type)) return 'parking'
  if (row.property_type === 'storage_unit') return 'storage'
  if (row.property_type === 'land_plot') return 'land'
  if (row.property_type === 'investment_property') return 'investment'
  return 'residential'
}

function getCoverImage(row: ListingRow) {
  const sorted = [...(row.listing_images ?? [])].sort((a, b) => {
    if (a.is_cover === b.is_cover) return a.position - b.position
    return a.is_cover ? -1 : 1
  })

  return sorted[0]?.image_url ?? FALLBACK_IMAGE
}

function getBadge(row: ListingRow) {
  if (row.is_verified) return 'Verifierad annonsör'
  if (getListingSegment(row) === 'commercial') return row.commercial_type === 'office' ? 'Kontor' : 'Lokal'
  if (getListingSegment(row) === 'parking') return 'Parkering'
  if (getListingSegment(row) === 'storage') return 'Förråd / lager'
  if (getListingSegment(row) === 'land') return 'Mark / tomt'
  if (getListingSegment(row) === 'investment') return 'Investeringsobjekt'
  return row.listing_type === 'rent' ? 'Hyra' : 'Till salu'
}

function mapListingCard(row: ListingRow): ListingCardItem {
  const listingSegment = getListingSegment(row)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    areaName: row.area_name ?? row.city,
    listingType: row.listing_purpose ?? row.listing_type,
    listingSegment,
    propertyType: row.property_type ?? getDefaultPropertyType(listingSegment, row.commercial_type),
    status: row.status,
    price: row.price,
    rooms: toNumber(row.rooms),
    areaSqm: toNumber(row.area_sqm),
    imageUrl: getCoverImage(row),
    badge: getBadge(row),
    availableFrom: row.available_from,
    features: (row.listing_features ?? []).map((feature) => feature.feature_label),
    commercialType: row.commercial_type ?? null,
    parkingType: row.parking_type ?? null,
    storageType: row.storage_type ?? null,
    landType: row.land_type ?? null,
    investmentType: row.investment_type ?? null,
    businessPurpose: row.business_purpose ?? null,
    isVatApplicable: Boolean(row.is_vat_applicable),
    monthlyServiceFee: row.monthly_service_fee ?? null,
    pricePerSqm: row.price_per_sqm ?? null,
    minLeaseMonths: row.min_lease_months ?? null,
    annualIncome: row.annual_income ?? null,
    operatingCost: row.operating_cost ?? null,
    capRate: toNullableNumber(row.cap_rate),
    unitsCount: row.units_count ?? null,
    occupancyRate: toNullableNumber(row.occupancy_rate),
    vacancyRate: toNullableNumber(row.vacancy_rate),
    isVerified: row.is_verified,
  }
}

function mapListingDetail(row: ListingRow): ListingDetailItem {
  const rentalRequirement = row.rental_requirements?.[0] ?? null

  return {
    ...mapListingCard(row),
    description: row.description ?? '',
    street: row.street,
    zipCode: row.zip_code,
    country: row.country,
    floor: row.floor,
    buildYear: row.build_year,
    monthlyFee: row.monthly_fee,
    latitude: toNullableNumber(row.latitude),
    longitude: toNullableNumber(row.longitude),
    images: [...(row.listing_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        altText: image.alt_text,
        isCover: image.is_cover,
        position: image.position,
      })),
    rentalRequirements: rentalRequirement
      ? {
          minIncome: rentalRequirement.min_income,
          petsAllowed: rentalRequirement.pets_allowed,
          smokingAllowed: rentalRequirement.smoking_allowed,
          referencesRequired: rentalRequirement.references_required,
          employmentRequired: rentalRequirement.employment_required,
        }
      : null,
  }
}

function queryBaseListings(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  return supabase.from('listings').select(`
      id,
      slug,
      title,
      description,
      listing_type,
      listing_purpose,
      listing_segment,
      property_type,
      commercial_type,
      parking_type,
      storage_type,
      land_type,
      investment_type,
      business_purpose,
      is_vat_applicable,
      monthly_service_fee,
      price_per_sqm,
      min_lease_months,
      annual_income,
      operating_cost,
      cap_rate,
      units_count,
      occupancy_rate,
      vacancy_rate,
      has_balcony,
      has_elevator,
      has_parking,
      pets_allowed,
      workplaces,
      meeting_rooms,
      is_furnished,
      has_reception,
      access_24_7,
      has_ev_charger,
      is_garage,
      has_camera_surveillance,
      max_vehicle_height_cm,
      is_heated,
      has_loading_zone,
      has_elevator_access,
      has_detail_plan,
      has_building_rights,
      has_water_sewer,
      has_electricity,
      has_road_access,
      status,
      street,
      city,
      zip_code,
      country,
      area_name,
      latitude,
      longitude,
      price,
      monthly_fee,
      area_sqm,
      rooms,
      floor,
      build_year,
      available_from,
      is_verified,
      published_at,
      created_by,
      company_id,
      created_at,
      listing_images (
        id,
        image_url,
        alt_text,
        position,
        is_cover
      ),
      listing_features (
        feature_label
      ),
      rental_requirements (
        min_income,
        pets_allowed,
        smoking_allowed,
        references_required,
        employment_required
      )
    `)
}

function hasPositiveNumber(value: string | undefined) {
  if (!value) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0
}

function applyBooleanFilter(query: any, column: string, value: string | undefined) {
  return value === 'true' ? query.eq(column, true) : query
}

function applyFilters<T>(builder: T, filters: SearchFilters): T {
  let query = builder as any
  if (filters.mode) query = query.eq('listing_type', filters.mode)
  if (filters.city) {
    const search = filters.city.replace(/[,()]/g, ' ').trim()
    if (search) query = query.or(`city.ilike.%${search}%,area_name.ilike.%${search}%,street.ilike.%${search}%`)
  }
  if (filters.propertyType) query = query.eq('property_type', filters.propertyType)
  if (filters.rooms) query = query.gte('rooms', Number(filters.rooms))
  if (filters.minRooms) query = query.gte('rooms', Number(filters.minRooms))
  if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
  if (filters.minArea) query = query.gte('area_sqm', Number(filters.minArea))
  if (filters.maxArea) query = query.lte('area_sqm', Number(filters.maxArea))
  if (filters.availableFrom) query = query.gte('available_from', filters.availableFrom)

  if (filters.category && filters.category !== 'all') {
    if (filters.category === 'office') {
      query = query.eq('listing_segment', 'commercial').eq('commercial_type', 'office')
    } else if (filters.category === 'commercial') {
      query = query.eq('listing_segment', 'commercial').neq('commercial_type', 'office')
    } else {
      query = query.eq('listing_segment', filters.category)
    }
  } else if (filters.segment) {
    query = query.eq('listing_segment', filters.segment)
  }

  if (filters.commercialType) query = query.eq('commercial_type', filters.commercialType)
  if (filters.parkingType) query = query.eq('parking_type', filters.parkingType)
  if (filters.storageType) query = query.eq('storage_type', filters.storageType)
  if (filters.landType) query = query.eq('land_type', filters.landType)
  if (filters.investmentType) query = query.eq('investment_type', filters.investmentType)

  query = applyBooleanFilter(query, 'has_balcony', filters.hasBalcony)
  query = applyBooleanFilter(query, 'has_elevator', filters.hasElevator)
  query = applyBooleanFilter(query, 'has_parking', filters.hasParking)
  query = applyBooleanFilter(query, 'pets_allowed', filters.petsAllowed)
  query = applyBooleanFilter(query, 'is_vat_applicable', filters.isVatApplicable)
  query = applyBooleanFilter(query, 'is_furnished', filters.isFurnished)
  query = applyBooleanFilter(query, 'has_reception', filters.hasReception)
  query = applyBooleanFilter(query, 'access_24_7', filters.access247)
  query = applyBooleanFilter(query, 'has_ev_charger', filters.hasEvCharger)
  query = applyBooleanFilter(query, 'is_garage', filters.isGarage)
  query = applyBooleanFilter(query, 'has_camera_surveillance', filters.hasCameraSurveillance)
  query = applyBooleanFilter(query, 'is_heated', filters.isHeated)
  query = applyBooleanFilter(query, 'has_loading_zone', filters.hasLoadingZone)
  query = applyBooleanFilter(query, 'has_elevator_access', filters.hasElevatorAccess)
  query = applyBooleanFilter(query, 'has_detail_plan', filters.hasDetailPlan)
  query = applyBooleanFilter(query, 'has_building_rights', filters.hasBuildingRights)
  query = applyBooleanFilter(query, 'has_water_sewer', filters.hasWaterSewer)
  query = applyBooleanFilter(query, 'has_electricity', filters.hasElectricity)
  query = applyBooleanFilter(query, 'has_road_access', filters.hasRoadAccess)

  if (hasPositiveNumber(filters.minLeaseMonths)) query = query.gte('min_lease_months', Number(filters.minLeaseMonths))
  if (hasPositiveNumber(filters.workplaces)) query = query.gte('workplaces', Number(filters.workplaces))
  if (hasPositiveNumber(filters.meetingRooms)) query = query.gte('meeting_rooms', Number(filters.meetingRooms))
  if (hasPositiveNumber(filters.maxVehicleHeightCm)) query = query.gte('max_vehicle_height_cm', Number(filters.maxVehicleHeightCm))
  if (hasPositiveNumber(filters.minLandArea)) query = query.gte('area_sqm', Number(filters.minLandArea))
  if (hasPositiveNumber(filters.minUnits)) query = query.gte('units_count', Number(filters.minUnits))
  if (hasPositiveNumber(filters.minNoi)) query = query.gte('annual_income', Number(filters.minNoi))
  if (hasPositiveNumber(filters.minCapRate)) query = query.gte('cap_rate', Number(filters.minCapRate))
  if (hasPositiveNumber(filters.minOccupancyRate)) query = query.gte('occupancy_rate', Number(filters.minOccupancyRate))
  if (hasPositiveNumber(filters.maxVacancyRate)) query = query.lte('vacancy_rate', Number(filters.maxVacancyRate))

  return query as T
}

export async function getPublishedListings(filters: SearchFilters = {}, options?: { limit?: number }) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return [] as ListingCardItem[]

  let builder = queryBaseListings(supabase).eq('status', 'published')

  builder = applyFilters(builder, filters)

  if (filters.sort === 'price_asc') {
    builder = builder.order('price', { ascending: true })
  } else if (filters.sort === 'price_desc') {
    builder = builder.order('price', { ascending: false })
  } else if (filters.sort === 'area_desc') {
    builder = builder.order('area_sqm', { ascending: false })
  } else {
    builder = builder.order('published_at', { ascending: false }).order('created_at', { ascending: false })
  }
  if (options?.limit) builder = builder.limit(options.limit)

  const { data, error } = await builder
  if (error) {
    console.error('Failed to fetch published listings', error)
    return []
  }

  return (data ?? []).map((row) => mapListingCard(row as ListingRow))
}

export async function getListingBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await queryBaseListings(supabase)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch listing by slug', error)
    return null
  }

  if (!data) return null
  return mapListingDetail(data as ListingRow)
}

export async function getRelatedListings(listing: ListingDetailItem, limit = 3) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return [] as ListingCardItem[]

  const { data, error } = await queryBaseListings(supabase)
    .eq('status', 'published')
    .eq('listing_type', listing.listingType)
    .eq('listing_segment', listing.listingSegment)
    .eq('city', listing.city)
    .neq('slug', listing.slug)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch related listings', error)
    return []
  }

  return (data ?? []).map((row) => mapListingCard(row as ListingRow))
}

export async function getDashboardListings() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { isSignedIn: false, listings: [] as ListingCardItem[] }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isSignedIn: false, listings: [] as ListingCardItem[] }
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Failed to fetch company memberships', membershipError)
  }

  const companyIds = (memberships ?? []).map((item) => item.company_id)

  let builder = queryBaseListings(supabase)
  if (companyIds.length > 0) {
    builder = builder.or(`created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`)
  } else {
    builder = builder.eq('created_by', user.id)
  }

  const { data, error } = await builder.order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch dashboard listings', error)
    return { isSignedIn: true, listings: [] }
  }

  return { isSignedIn: true, listings: (data ?? []).map((row) => mapListingCard(row as ListingRow)) }
}
