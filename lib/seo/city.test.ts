import { describe, expect, it } from 'vitest'
import { cityDisplayNameToSlug, citySlugToDisplayName } from './city'

describe('cityDisplayNameToSlug', () => {
  it('slugifies Swedish city names', () => {
    expect(cityDisplayNameToSlug('Göteborg')).toBe('goteborg')
    expect(cityDisplayNameToSlug('Malmö')).toBe('malmo')
    expect(cityDisplayNameToSlug('Upplands Väsby')).toBe('upplands-vasby')
  })
})

describe('citySlugToDisplayName', () => {
  it('restores known cities with Swedish characters', () => {
    expect(citySlugToDisplayName('goteborg')).toBe('Göteborg')
    expect(citySlugToDisplayName('vasteras')).toBe('Västerås')
  })

  it('title-cases unknown slugs', () => {
    expect(citySlugToDisplayName('upplands-vasby')).toBe('Upplands Vasby')
    expect(citySlugToDisplayName('kiruna')).toBe('Kiruna')
  })

  it('round-trips known cities', () => {
    expect(citySlugToDisplayName(cityDisplayNameToSlug('Örebro'))).toBe('Örebro')
  })
})
