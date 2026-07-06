import { describe, expect, it } from 'vitest'
import { homeSatisfiesWish, profilesMatch, type MatchableExchangeProfile } from './matching'

function profile(id: string, overrides: Partial<MatchableExchangeProfile> = {}): MatchableExchangeProfile {
  return {
    id,
    home: {
      city: 'Stockholm',
      area: 'Södermalm',
      rooms: 2,
      areaSqm: 55,
      rent: 11000,
      hasAccessibility: false,
      ...(overrides.home ?? {}),
    },
    wish: {
      cities: ['Göteborg'],
      areas: [],
      minRooms: null,
      maxRent: null,
      minAreaSqm: null,
      needsAccessibility: false,
      ...(overrides.wish ?? {}),
    },
  }
}

describe('homeSatisfiesWish', () => {
  it('matches city case-insensitively', () => {
    const p = profile('a')
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['stockholm'] })).toBe(true)
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['Malmö'] })).toBe(false)
  })

  it('accepts any city when no cities are specified', () => {
    const p = profile('a')
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: [] })).toBe(true)
  })

  it('enforces rooms, rent and area thresholds', () => {
    const p = profile('a')
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['Stockholm'], minRooms: 3 })).toBe(false)
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['Stockholm'], maxRent: 10000 })).toBe(false)
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['Stockholm'], minAreaSqm: 60 })).toBe(false)
    expect(
      homeSatisfiesWish(p.home, { ...p.wish, cities: ['Stockholm'], minRooms: 2, maxRent: 11000, minAreaSqm: 50 }),
    ).toBe(true)
  })

  it('enforces accessibility requirement', () => {
    const p = profile('a')
    expect(homeSatisfiesWish(p.home, { ...p.wish, cities: ['Stockholm'], needsAccessibility: true })).toBe(false)
    expect(
      homeSatisfiesWish({ ...p.home, hasAccessibility: true }, { ...p.wish, cities: ['Stockholm'], needsAccessibility: true }),
    ).toBe(true)
  })
})

describe('profilesMatch', () => {
  it('requires mutual satisfaction', () => {
    const stockholm = profile('a', {
      home: { city: 'Stockholm', area: null, rooms: 2, areaSqm: 55, rent: 11000, hasAccessibility: false },
      wish: { cities: ['Göteborg'], areas: [], minRooms: null, maxRent: null, minAreaSqm: null, needsAccessibility: false },
    })
    const gothenburg = profile('b', {
      home: { city: 'Göteborg', area: null, rooms: 3, areaSqm: 70, rent: 9500, hasAccessibility: false },
      wish: { cities: ['Stockholm'], areas: [], minRooms: 2, maxRent: 12000, minAreaSqm: null, needsAccessibility: false },
    })
    expect(profilesMatch(stockholm, gothenburg)).toBe(true)

    const tooExpensive = profile('c', {
      home: { city: 'Göteborg', area: null, rooms: 3, areaSqm: 70, rent: 9500, hasAccessibility: false },
      wish: { cities: ['Stockholm'], areas: [], minRooms: 2, maxRent: 9000, minAreaSqm: null, needsAccessibility: false },
    })
    expect(profilesMatch(stockholm, tooExpensive)).toBe(false)
  })

  it('never matches a profile with itself', () => {
    const p = profile('a', { wish: { cities: ['Stockholm'], areas: [], minRooms: null, maxRent: null, minAreaSqm: null, needsAccessibility: false } })
    expect(profilesMatch(p, p)).toBe(false)
  })
})
