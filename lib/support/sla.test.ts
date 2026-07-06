import { describe, expect, it } from 'vitest'
import { slaDueAt, slaState } from './sla'

const createdAt = new Date('2026-07-06T08:00:00Z')

describe('slaDueAt', () => {
  it('derives the due date from priority', () => {
    expect(slaDueAt('urgent', createdAt).toISOString()).toBe('2026-07-06T12:00:00.000Z')
    expect(slaDueAt('normal', createdAt).toISOString()).toBe('2026-07-07T08:00:00.000Z')
    expect(slaDueAt('low', createdAt).toISOString()).toBe('2026-07-09T08:00:00.000Z')
  })
})

describe('slaState', () => {
  it('is met when first response came before the due date', () => {
    expect(
      slaState({ priority: 'normal', createdAt, firstResponseAt: new Date('2026-07-06T10:00:00Z'), now: new Date('2026-07-08T00:00:00Z') }),
    ).toBe('met')
  })

  it('is breached when first response came after the due date', () => {
    expect(
      slaState({ priority: 'urgent', createdAt, firstResponseAt: new Date('2026-07-06T13:00:00Z'), now: new Date('2026-07-06T14:00:00Z') }),
    ).toBe('breached')
  })

  it('tracks unanswered tickets through on_track, at_risk and breached', () => {
    const base = { priority: 'urgent' as const, createdAt, firstResponseAt: null }
    expect(slaState({ ...base, now: new Date('2026-07-06T09:00:00Z') })).toBe('on_track')
    expect(slaState({ ...base, now: new Date('2026-07-06T11:30:00Z') })).toBe('at_risk')
    expect(slaState({ ...base, now: new Date('2026-07-06T12:01:00Z') })).toBe('breached')
  })
})
