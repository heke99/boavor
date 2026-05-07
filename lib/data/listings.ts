import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ListingCardItem, ListingDetailItem, ListingType, PropertyType, SearchFilters } from '@/lib/types'

type ListingRow = {
  id: string
  slug: string
  title: string
  description: string | null
  listing_type: ListingType
  property_type: PropertyType
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

function getCoverImage(row: ListingRow) {
  const sorted = [...(row.listing_images ?? [])].sort((a, b) => {
    if (a.is_cover === b.is_cover) return a.position - b.position
    return a.is_cover ? -1 : 1
  })

  return sorted[0]?.image_url ?? FALLBACK_IMAGE
}

function getBadge(row: ListingRow) {
  if (row.is_verified) return 'Verifierad annonsör'
  return row.listing_type === 'rent' ? 'Hyra' : 'Till salu'
}

function mapListingCard(row: ListingRow): ListingCardItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    areaName: row.area_name ?? row.city,
    listingType: row.listing_type,
    propertyType: row.property_type,
    status: row.status,
    price: row.price,
    rooms: toNumber(row.rooms),
    areaSqm: toNumber(row.area_sqm),
    imageUrl: getCoverImage(row),
    badge: getBadge(row),
    availableFrom: row.available_from,
    features: (row.listing_features ?? []).map((feature) => feature.feature_label),
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
      property_type,
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

export async function getPublishedListings(filters: SearchFilters = {}, options?: { limit?: number }) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return [] as ListingCardItem[]

  let builder = queryBaseListings(supabase)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.mode) builder = builder.eq('listing_type', filters.mode)
  if (filters.city) builder = builder.ilike('city', `%${filters.city}%`)
  if (filters.propertyType) builder = builder.eq('property_type', filters.propertyType)
  if (filters.rooms) builder = builder.gte('rooms', Number(filters.rooms))
  if (filters.maxPrice) builder = builder.lte('price', Number(filters.maxPrice))
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