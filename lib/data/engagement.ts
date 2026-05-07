import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { FavoriteItem, ListingCardItem, PropertyType, SavedSearchItem, SavedSearchMode } from '@/lib/types'

type FavoriteListingRow = {
  id: string
  slug: string
  title: string
  city: string
  area_name: string | null
  listing_type: ListingCardItem['listingType']
  property_type: ListingCardItem['propertyType']
  status: ListingCardItem['status']
  price: number
  area_sqm: number | string | null
  rooms: number | string | null
  available_from: string | null
  is_verified: boolean
  listing_images?: Array<{
    image_url: string
    position: number
    is_cover: boolean
  }>
  listing_features?: Array<{
    feature_label: string
  }>
}

type FavoriteRow = {
  id: string
  created_at: string
  listings: FavoriteListingRow[] | null
}

type SavedSearchRow = {
  id: string
  title: string
  mode: SavedSearchMode
  city: string | null
  property_type: PropertyType | null
  min_rooms: number | null
  max_price: number | null
  notifications_enabled: boolean
  created_at: string
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function mapListing(listing: FavoriteListingRow): ListingCardItem {
  const sortedImages = [...(listing.listing_images ?? [])].sort((a, b) => {
    if (a.is_cover === b.is_cover) return a.position - b.position
    return a.is_cover ? -1 : 1
  })

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    city: listing.city,
    areaName: listing.area_name ?? listing.city,
    listingType: listing.listing_type,
    propertyType: listing.property_type,
    status: listing.status,
    price: listing.price,
    rooms: toNumber(listing.rooms),
    areaSqm: toNumber(listing.area_sqm),
    imageUrl: sortedImages[0]?.image_url ?? FALLBACK_IMAGE,
    badge: listing.is_verified ? 'Verifierad annonsör' : listing.listing_type === 'rent' ? 'Hyra' : 'Till salu',
    availableFrom: listing.available_from,
    features: (listing.listing_features ?? []).map((feature) => feature.feature_label).slice(0, 3),
    isVerified: listing.is_verified,
  }
}

export async function getDashboardFavorites() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { isSignedIn: false as const, favorites: [] as FavoriteItem[] }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isSignedIn: false as const, favorites: [] as FavoriteItem[] }

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      listings (
        id,
        slug,
        title,
        city,
        area_name,
        listing_type,
        property_type,
        status,
        price,
        area_sqm,
        rooms,
        available_from,
        is_verified,
        listing_images (
          image_url,
          position,
          is_cover
        ),
        listing_features (
          feature_label
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch favorites', error)
    return { isSignedIn: true as const, favorites: [] as FavoriteItem[] }
  }

  const favorites = (data ?? [])
    .map((row) => row as FavoriteRow)
    .map((row) => {
      const listing = row.listings?.[0] ?? null
      if (!listing) return null

      return {
        id: row.id,
        createdAt: row.created_at,
        listing: mapListing(listing),
      }
    })
    .filter((item): item is FavoriteItem => item !== null)

  return { isSignedIn: true as const, favorites }
}

export async function getSavedSearches() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { isSignedIn: false as const, searches: [] as SavedSearchItem[] }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isSignedIn: false as const, searches: [] as SavedSearchItem[] }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('id, title, mode, city, property_type, min_rooms, max_price, notifications_enabled, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch saved searches', error)
    return { isSignedIn: true as const, searches: [] as SavedSearchItem[] }
  }

  const searches = (data ?? []).map((row) => {
    const typedRow = row as SavedSearchRow

    return {
      id: typedRow.id,
      title: typedRow.title,
      mode: typedRow.mode,
      city: typedRow.city,
      propertyType: typedRow.property_type,
      minRooms: typedRow.min_rooms,
      maxPrice: typedRow.max_price,
      notificationsEnabled: typedRow.notifications_enabled,
      createdAt: typedRow.created_at,
    }
  })

  return { isSignedIn: true as const, searches }
}