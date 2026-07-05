import { describe, expect, it } from 'vitest'
import { canTransition, nextStatuses, normalizeStatus, statusLabel } from './status-machine'

describe('normalizeStatus', () => {
  it('maps legacy enum values to canonical statuses', () => {
    expect(normalizeStatus('received')).toBe('submitted')
    expect(normalizeStatus('reserve')).toBe('shortlisted')
    expect(normalizeStatus('viewing')).toBe('viewing_invited')
    expect(normalizeStatus('submitted')).toBe('submitted')
  })
})

describe('canTransition — landlord', () => {
  it('allows the happy path', () => {
    expect(canTransition('submitted', 'reviewing', 'landlord')).toBe(true)
    expect(canTransition('reviewing', 'shortlisted', 'landlord')).toBe(true)
    expect(canTransition('shortlisted', 'viewing_invited', 'landlord')).toBe(true)
    expect(canTransition('viewing_booked', 'offered', 'landlord')).toBe(true)
    expect(canTransition('offered', 'offer_accepted', 'landlord')).toBe(true)
    expect(canTransition('contract_pending', 'signed', 'landlord')).toBe(true)
  })

  it('blocks invalid jumps', () => {
    expect(canTransition('submitted', 'signed', 'landlord')).toBe(false)
    expect(canTransition('submitted', 'offer_accepted', 'landlord')).toBe(false)
    expect(canTransition('rejected', 'offered', 'landlord')).toBe(false)
    expect(canTransition('withdrawn', 'reviewing', 'landlord')).toBe(false)
  })

  it('blocks no-op transitions', () => {
    expect(canTransition('reviewing', 'reviewing', 'landlord')).toBe(false)
  })

  it('handles legacy from-statuses', () => {
    expect(canTransition('received', 'reviewing', 'landlord')).toBe(true)
    expect(canTransition('reserve', 'offered', 'landlord')).toBe(true)
  })
})

describe('canTransition — applicant', () => {
  it('can withdraw active applications', () => {
    expect(canTransition('submitted', 'withdrawn', 'applicant')).toBe(true)
    expect(canTransition('offered', 'withdrawn', 'applicant')).toBe(true)
  })

  it('can accept offers and book viewings', () => {
    expect(canTransition('offered', 'offer_accepted', 'applicant')).toBe(true)
    expect(canTransition('viewing_invited', 'viewing_booked', 'applicant')).toBe(true)
  })

  it('cannot manage the landlord pipeline', () => {
    expect(canTransition('submitted', 'shortlisted', 'applicant')).toBe(false)
    expect(canTransition('reviewing', 'rejected', 'applicant')).toBe(false)
    expect(canTransition('rejected', 'withdrawn', 'applicant')).toBe(false)
  })
})

describe('canTransition — system', () => {
  it('can expire and close applications', () => {
    expect(canTransition('offered', 'expired', 'system')).toBe(true)
    expect(canTransition('submitted', 'rented_to_other', 'system')).toBe(true)
    expect(canTransition('contract_pending', 'signed', 'system')).toBe(true)
  })

  it('cannot touch terminal states', () => {
    expect(canTransition('signed', 'expired', 'system')).toBe(false)
  })
})

describe('canTransition — admin', () => {
  it('can correct non-terminal states freely', () => {
    expect(canTransition('submitted', 'offered', 'admin')).toBe(true)
  })

  it('can only reopen terminal states to reviewing', () => {
    expect(canTransition('rejected', 'reviewing', 'admin')).toBe(true)
    expect(canTransition('rejected', 'offered', 'admin')).toBe(false)
  })
})

describe('nextStatuses', () => {
  it('lists landlord options for shortlisted', () => {
    expect(nextStatuses('shortlisted', 'landlord')).toEqual(
      expect.arrayContaining(['viewing_invited', 'offered', 'rejected', 'rented_to_other']),
    )
  })

  it('is empty for terminal states', () => {
    expect(nextStatuses('signed', 'landlord')).toEqual([])
  })
})

describe('statusLabel', () => {
  it('returns Swedish labels including for legacy values', () => {
    expect(statusLabel('offered')).toBe('Erbjuden bostaden')
    expect(statusLabel('reserve')).toBe('Slutkandidat')
  })
})
