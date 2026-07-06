/**
 * Bovaro Byta matching (pure, tested).
 *
 * Two exchange profiles match when each party's current home satisfies the
 * other party's wanted criteria.
 */

export type ExchangeHome = {
  city: string
  area: string | null
  rooms: number
  areaSqm: number | null
  rent: number
  hasAccessibility: boolean
}

export type ExchangeWish = {
  cities: string[]
  areas: string[]
  minRooms: number | null
  maxRent: number | null
  minAreaSqm: number | null
  needsAccessibility: boolean
}

export type MatchableExchangeProfile = {
  id: string
  home: ExchangeHome
  wish: ExchangeWish
}

/** Does `home` satisfy `wish`? */
export function homeSatisfiesWish(home: ExchangeHome, wish: ExchangeWish): boolean {
  if (wish.cities.length > 0) {
    const cityMatch = wish.cities.some((city) => home.city.toLowerCase().includes(city.trim().toLowerCase()))
    if (!cityMatch) return false
  }

  if (wish.areas.length > 0 && home.area) {
    // Areas are a soft preference layered on top of the city requirement:
    // only exclude when both sides specify areas that clearly do not overlap.
    const areaMatch = wish.areas.some((area) => (home.area ?? '').toLowerCase().includes(area.trim().toLowerCase()))
    if (!areaMatch && wish.cities.length === 0) return false
  }

  if (wish.minRooms !== null && home.rooms < wish.minRooms) return false
  if (wish.maxRent !== null && home.rent > wish.maxRent) return false
  if (wish.minAreaSqm !== null && (home.areaSqm === null || home.areaSqm < wish.minAreaSqm)) return false
  if (wish.needsAccessibility && !home.hasAccessibility) return false

  return true
}

/** Mutual match: A's home fits B's wish AND B's home fits A's wish. */
export function profilesMatch(a: MatchableExchangeProfile, b: MatchableExchangeProfile): boolean {
  if (a.id === b.id) return false
  return homeSatisfiesWish(a.home, b.wish) && homeSatisfiesWish(b.home, a.wish)
}
