import { describe, expect, it } from 'vitest'
import { getLegalDocument, pendingReacceptances, type LegalDocument } from './versions'

const documents: LegalDocument[] = [
  { type: 'terms', title: 'Villkor', path: '/terms', version: '2026-05-09', requiresAcceptance: true },
  { type: 'privacy', title: 'Integritet', path: '/privacy', version: '2026-06-01', requiresAcceptance: true },
  { type: 'cookies', title: 'Cookies', path: '/cookies', version: '2026-05-09', requiresAcceptance: false },
]

describe('pendingReacceptances', () => {
  it('returns nothing when all current versions are accepted', () => {
    const acceptances = [
      { document_type: 'terms', document_version: '2026-05-09' },
      { document_type: 'privacy', document_version: '2026-06-01' },
    ]
    expect(pendingReacceptances(acceptances, documents)).toEqual([])
  })

  it('flags documents where only an older version was accepted', () => {
    const acceptances = [
      { document_type: 'terms', document_version: '2026-05-09' },
      { document_type: 'privacy', document_version: '2025-01-01' },
    ]
    const pending = pendingReacceptances(acceptances, documents)
    expect(pending.map((doc) => doc.type)).toEqual(['privacy'])
  })

  it('flags everything for a user without acceptances, except non-mandatory docs', () => {
    const pending = pendingReacceptances([], documents)
    expect(pending.map((doc) => doc.type)).toEqual(['terms', 'privacy'])
  })
})

describe('getLegalDocument', () => {
  it('returns the registry entry', () => {
    expect(getLegalDocument('terms').path).toBe('/terms')
  })
})
