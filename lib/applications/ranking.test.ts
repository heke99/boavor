import { describe, expect, it } from 'vitest'
import { rankApplications, type RankableApplication } from './ranking'

function app(overrides: Partial<RankableApplication> & { id: string }): RankableApplication {
  return {
    queuePointsSnapshot: 0,
    createdAt: '2026-07-01T10:00:00Z',
    policyResult: 'eligible',
    randomRank: null,
    ...overrides,
  }
}

describe('rankApplications — strict_queue', () => {
  it('sorts by queue points descending, eligible first', () => {
    const ranked = rankApplications('strict_queue', [
      app({ id: 'low', queuePointsSnapshot: 10 }),
      app({ id: 'high', queuePointsSnapshot: 500 }),
      app({ id: 'ineligible', queuePointsSnapshot: 900, policyResult: 'not_eligible' }),
    ])
    expect(ranked.map((item) => item.application.id)).toEqual(['high', 'low', 'ineligible'])
    expect(ranked[0].rank).toBe(1)
  })

  it('breaks queue ties by submission time', () => {
    const ranked = rankApplications('strict_queue', [
      app({ id: 'later', queuePointsSnapshot: 100, createdAt: '2026-07-02T10:00:00Z' }),
      app({ id: 'earlier', queuePointsSnapshot: 100, createdAt: '2026-07-01T10:00:00Z' }),
    ])
    expect(ranked.map((item) => item.application.id)).toEqual(['earlier', 'later'])
  })
})

describe('rankApplications — first_come', () => {
  it('sorts by submitted time ascending', () => {
    const ranked = rankApplications('first_come', [
      app({ id: 'second', createdAt: '2026-07-02T10:00:00Z' }),
      app({ id: 'first', createdAt: '2026-07-01T09:00:00Z' }),
    ])
    expect(ranked.map((item) => item.application.id)).toEqual(['first', 'second'])
  })
})

describe('rankApplications — random', () => {
  it('sorts by assigned random rank and leaves unassigned unranked', () => {
    const ranked = rankApplications('random', [
      app({ id: 'b', randomRank: 0.8 }),
      app({ id: 'a', randomRank: 0.2 }),
      app({ id: 'pending', randomRank: null }),
    ])
    expect(ranked.map((item) => item.application.id)).toEqual(['a', 'b', 'pending'])
    expect(ranked[2].rank).toBeNull()
  })
})

describe('rankApplications — guided_queue', () => {
  it('produces recommendation labels', () => {
    const ranked = rankApplications('guided_queue', [app({ id: 'only', queuePointsSnapshot: 5 })])
    expect(ranked[0].rankLabel).toContain('Rekommenderad')
  })
})

describe('rankApplications — manual_with_policy', () => {
  it('produces no ranks', () => {
    const ranked = rankApplications('manual_with_policy', [app({ id: 'x' })])
    expect(ranked[0].rank).toBeNull()
  })
})
