import { createSupabaseServerClient } from '@/lib/supabase/server'
import { profilesMatch, type MatchableExchangeProfile } from '@/lib/byta/matching'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

export type ExchangeProfileRow = {
  id: string
  user_id: string
  status: string
  current_city: string
  current_area: string | null
  current_street: string | null
  current_rooms: number
  current_area_sqm: number | null
  current_rent: number
  current_landlord_name: string | null
  current_contract_type: string
  current_floor: string | null
  current_has_elevator: boolean
  current_has_balcony: boolean
  current_has_accessibility: boolean
  description: string | null
  wanted_cities: string[]
  wanted_areas: string[]
  wanted_min_rooms: number | null
  wanted_max_rent: number | null
  wanted_min_area_sqm: number | null
  wanted_needs_accessibility: boolean
  show_name_before_match: boolean
  show_exact_address: boolean
  created_at: string
}

const PROFILE_COLUMNS =
  'id, user_id, status, current_city, current_area, current_street, current_rooms, current_area_sqm, current_rent, current_landlord_name, current_contract_type, current_floor, current_has_elevator, current_has_balcony, current_has_accessibility, description, wanted_cities, wanted_areas, wanted_min_rooms, wanted_max_rent, wanted_min_area_sqm, wanted_needs_accessibility, show_name_before_match, show_exact_address, created_at'

export function toMatchable(row: ExchangeProfileRow): MatchableExchangeProfile {
  return {
    id: row.id,
    home: {
      city: row.current_city,
      area: row.current_area,
      rooms: Number(row.current_rooms),
      areaSqm: row.current_area_sqm === null ? null : Number(row.current_area_sqm),
      rent: row.current_rent,
      hasAccessibility: row.current_has_accessibility,
    },
    wish: {
      cities: row.wanted_cities ?? [],
      areas: row.wanted_areas ?? [],
      minRooms: row.wanted_min_rooms === null ? null : Number(row.wanted_min_rooms),
      maxRent: row.wanted_max_rent,
      minAreaSqm: row.wanted_min_area_sqm === null ? null : Number(row.wanted_min_area_sqm),
      needsAccessibility: row.wanted_needs_accessibility,
    },
  }
}

export async function getOwnExchangeProfile(supabase: SupabaseServerClient, userId: string) {
  const { data } = await supabase
    .from('exchange_profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as ExchangeProfileRow | null) ?? null
}

/** Active profiles browsable by verified users (RLS enforces verification). */
export async function getActiveExchangeProfiles(supabase: SupabaseServerClient, excludeUserId?: string) {
  let query = supabase
    .from('exchange_profiles')
    .select(PROFILE_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100)

  if (excludeUserId) query = query.neq('user_id', excludeUserId)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch exchange profiles', error)
    return []
  }
  return (data ?? []) as ExchangeProfileRow[]
}

/** Candidates matching the user's own profile (pure matching on top of RLS data). */
export async function getExchangeCandidates(supabase: SupabaseServerClient, own: ExchangeProfileRow) {
  const others = await getActiveExchangeProfiles(supabase, own.user_id)
  const ownMatchable = toMatchable(own)
  return others.filter((other) => profilesMatch(ownMatchable, toMatchable(other)))
}

export const EXCHANGE_MATCH_STATUS_LABELS: Record<string, string> = {
  contact_started: 'Kontakt inledd',
  documents_shared: 'Underlag delade',
  landlord_review: 'Hos hyresvärdarna för granskning',
  approved: 'Godkänt av hyresvärdarna',
  rejected: 'Nekat av hyresvärd',
  completed: 'Byte genomfört',
}

export const EXCHANGE_MATCH_NEXT_STATUS: Record<string, string[]> = {
  contact_started: ['documents_shared'],
  documents_shared: ['landlord_review'],
  landlord_review: ['approved', 'rejected'],
  approved: ['completed'],
  rejected: [],
  completed: [],
}
