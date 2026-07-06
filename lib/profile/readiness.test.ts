import { describe, expect, it } from 'vitest'
import { calculateReadiness, type ReadinessInput } from './readiness'

const NOW = new Date('2026-07-05T12:00:00Z')

function completeInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    identityVerified: true,
    isAdult: true,
    firstName: 'Anna',
    lastName: 'Andersson',
    phone: '0701234567',
    city: 'Stockholm',
    monthlyIncome: 32000,
    employmentStatus: 'employed',
    householdSize: 2,
    desiredMoveIn: '2026-09-01',
    desiredLocations: ['Stockholm'],
    personalLetter: 'Hej!',
    currentHousingSituation: 'second_hand',
    documents: [{ documentType: 'income_proof', status: 'active', expiresAt: null }],
    queueActive: true,
    ...overrides,
  }
}

describe('calculateReadiness', () => {
  it('scores a complete profile at 100 and allows applying', () => {
    const result = calculateReadiness(completeInput(), NOW)
    expect(result.score).toBe(100)
    expect(result.canApply).toBe(true)
    expect(result.blocking).toHaveLength(0)
    expect(result.missing).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('blocks applying without verified identity', () => {
    const result = calculateReadiness(completeInput({ identityVerified: false }), NOW)
    expect(result.canApply).toBe(false)
    expect(result.blocking.map((item) => item.key)).toContain('identity')
  })

  it('blocks applying for minors', () => {
    const result = calculateReadiness(completeInput({ isAdult: false }), NOW)
    expect(result.canApply).toBe(false)
    expect(result.blocking.map((item) => item.key)).toContain('age')
  })

  it('flags missing income and documents', () => {
    const result = calculateReadiness(completeInput({ monthlyIncome: null, documents: [] }), NOW)
    expect(result.canApply).toBe(true)
    expect(result.missing.map((item) => item.key)).toEqual(expect.arrayContaining(['income', 'documents']))
    expect(result.score).toBeLessThan(100)
  })

  it('requires an income-type document specifically', () => {
    const result = calculateReadiness(
      completeInput({ documents: [{ documentType: 'reference', status: 'active', expiresAt: null }] }),
      NOW,
    )
    expect(result.missing.map((item) => item.key)).toContain('income_document')
  })

  it('ignores expired and rejected documents when counting usable ones', () => {
    const result = calculateReadiness(
      completeInput({
        documents: [
          { documentType: 'income_proof', status: 'active', expiresAt: '2026-01-01' },
          { documentType: 'income_proof', status: 'rejected', expiresAt: null },
        ],
      }),
      NOW,
    )
    expect(result.missing.map((item) => item.key)).toContain('documents')
    expect(result.warnings.map((item) => item.key)).toContain('rejected_documents')
  })

  it('warns about documents expiring within 30 days', () => {
    const result = calculateReadiness(
      completeInput({
        documents: [{ documentType: 'income_proof', status: 'active', expiresAt: '2026-07-20' }],
      }),
      NOW,
    )
    expect(result.warnings.map((item) => item.key)).toContain('expiring_documents')
    expect(result.missing).toHaveLength(0)
  })

  it('treats pending_review documents as usable', () => {
    const result = calculateReadiness(
      completeInput({
        documents: [{ documentType: 'income_proof', status: 'pending_review', expiresAt: null }],
      }),
      NOW,
    )
    expect(result.missing).toHaveLength(0)
  })

  it('warns when the queue is inactive', () => {
    const result = calculateReadiness(completeInput({ queueActive: false }), NOW)
    expect(result.warnings.map((item) => item.key)).toContain('queue')
  })

  it('never returns a negative score', () => {
    const result = calculateReadiness(
      {
        identityVerified: false,
        isAdult: false,
        firstName: null,
        lastName: null,
        phone: null,
        city: null,
        monthlyIncome: null,
        employmentStatus: null,
        householdSize: null,
        desiredMoveIn: null,
        desiredLocations: [],
        personalLetter: null,
        currentHousingSituation: null,
        documents: [],
        queueActive: false,
      },
      NOW,
    )
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.canApply).toBe(false)
  })
})
