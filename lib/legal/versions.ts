/**
 * Canonical registry of legal documents and their current versions.
 *
 * Versions are dates (YYYY-MM-DD). Bumping a version here makes signed-in
 * users see a re-acceptance prompt; acceptances are stored per
 * (user, document, version) in legal_acceptances so history is never lost.
 */

export type LegalDocumentType = 'terms' | 'privacy' | 'cookies' | 'advertiser_terms'

export type LegalDocument = {
  type: LegalDocumentType
  title: string
  path: string
  version: string
  /** Documents users must actively accept to keep using their account. */
  requiresAcceptance: boolean
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  { type: 'terms', title: 'Allmänna villkor', path: '/terms', version: '2026-05-09', requiresAcceptance: true },
  { type: 'privacy', title: 'Integritetspolicy', path: '/privacy', version: '2026-05-09', requiresAcceptance: true },
  { type: 'cookies', title: 'Cookiepolicy', path: '/cookies', version: '2026-05-09', requiresAcceptance: false },
  { type: 'advertiser_terms', title: 'Annonsörsvillkor', path: '/advertiser-terms', version: '2026-05-09', requiresAcceptance: false },
]

export function getLegalDocument(type: LegalDocumentType): LegalDocument {
  const document = LEGAL_DOCUMENTS.find((item) => item.type === type)
  if (!document) throw new Error(`Unknown legal document: ${type}`)
  return document
}

export type AcceptanceRow = {
  document_type: string
  document_version: string
}

/**
 * Documents whose CURRENT version the user has not accepted yet.
 * Only documents with requiresAcceptance are considered.
 */
export function pendingReacceptances(acceptances: AcceptanceRow[], documents: LegalDocument[] = LEGAL_DOCUMENTS): LegalDocument[] {
  const accepted = new Set(acceptances.map((row) => `${row.document_type}:${row.document_version}`))
  return documents.filter(
    (document) => document.requiresAcceptance && !accepted.has(`${document.type}:${document.version}`),
  )
}
