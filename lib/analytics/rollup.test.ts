import { describe, expect, it } from 'vitest'
import { buildCounterMetricRows, buildEventMetricRows, previousUtcDay, utcDayRange } from './rollup'

describe('previousUtcDay', () => {
  it('returns the day before in UTC', () => {
    expect(previousUtcDay(new Date('2026-07-06T10:30:00Z'))).toBe('2026-07-05')
  })

  it('handles month boundaries', () => {
    expect(previousUtcDay(new Date('2026-07-01T00:10:00Z'))).toBe('2026-06-30')
  })

  it('handles year boundaries', () => {
    expect(previousUtcDay(new Date('2026-01-01T02:00:00Z'))).toBe('2025-12-31')
  })
})

describe('utcDayRange', () => {
  it('returns a half-open UTC interval covering the day', () => {
    const range = utcDayRange('2026-07-05')
    expect(range.start).toBe('2026-07-05T00:00:00.000Z')
    expect(range.end).toBe('2026-07-06T00:00:00.000Z')
  })

  it('rejects malformed input', () => {
    expect(() => utcDayRange('20260705')).toThrow()
    expect(() => utcDayRange('2026-13-45')).toThrow()
  })
})

describe('buildEventMetricRows', () => {
  it('prefixes metrics with events. and keeps counts', () => {
    const rows = buildEventMetricRows('2026-07-05', [
      { event_type: 'listing_view', events: 12 },
      { event_type: 'search_performed', events: 4 },
    ])
    expect(rows).toEqual([
      { day: '2026-07-05', metric: 'events.listing_view', dimension: 'all', value: 12 },
      { day: '2026-07-05', metric: 'events.search_performed', dimension: 'all', value: 4 },
    ])
  })

  it('drops zero counts', () => {
    expect(buildEventMetricRows('2026-07-05', [{ event_type: 'listing_view', events: 0 }])).toEqual([])
  })
})

describe('buildCounterMetricRows', () => {
  it('maps counters to metric rows including zeroes', () => {
    const rows = buildCounterMetricRows('2026-07-05', { new_users: 3, applications_created: 0 })
    expect(rows).toEqual([
      { day: '2026-07-05', metric: 'new_users', dimension: 'all', value: 3 },
      { day: '2026-07-05', metric: 'applications_created', dimension: 'all', value: 0 },
    ])
  })

  it('drops non-finite values', () => {
    expect(buildCounterMetricRows('2026-07-05', { broken: Number.NaN })).toEqual([])
  })
})
