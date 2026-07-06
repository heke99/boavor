import { describe, expect, it } from 'vitest'
import { listingMatchesSavedSearch, type MatchableListing, type SavedSearchCriteria } from './matching'

const baseListing: MatchableListing = {
  listingType: 'rent',
  city: 'Stockholm',
  areaName: 'Södermalm',
  propertyType: 'apartment',
  rooms: 2,
  price: 12000,
}

const baseSearch: SavedSearchCriteria = {
  mode: 'rent',
  city: null,
  propertyType: null,
  minRooms: null,
  maxPrice: null,
}

describe('listingMatchesSavedSearch', () => {
  it('matches on mode', () => {
    expect(listingMatchesSavedSearch(baseSearch, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, mode: 'sale' }, baseListing)).toBe(false)
    expect(listingMatchesSavedSearch({ ...baseSearch, mode: 'all' }, baseListing)).toBe(true)
  })

  it('matches city case-insensitively against city and area', () => {
    expect(listingMatchesSavedSearch({ ...baseSearch, city: 'stockholm' }, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, city: 'söder' }, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, city: 'Göteborg' }, baseListing)).toBe(false)
  })

  it('matches property type exactly', () => {
    expect(listingMatchesSavedSearch({ ...baseSearch, propertyType: 'apartment' }, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, propertyType: 'house' }, baseListing)).toBe(false)
  })

  it('respects min rooms', () => {
    expect(listingMatchesSavedSearch({ ...baseSearch, minRooms: 2 }, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, minRooms: 3 }, baseListing)).toBe(false)
    expect(listingMatchesSavedSearch({ ...baseSearch, minRooms: 1 }, { ...baseListing, rooms: null })).toBe(false)
  })

  it('respects max price', () => {
    expect(listingMatchesSavedSearch({ ...baseSearch, maxPrice: 12000 }, baseListing)).toBe(true)
    expect(listingMatchesSavedSearch({ ...baseSearch, maxPrice: 11999 }, baseListing)).toBe(false)
  })

  it('combines all criteria', () => {
    const search: SavedSearchCriteria = {
      mode: 'rent',
      city: 'Stockholm',
      propertyType: 'apartment',
      minRooms: 2,
      maxPrice: 15000,
    }
    expect(listingMatchesSavedSearch(search, baseListing)).toBe(true)
  })
})
