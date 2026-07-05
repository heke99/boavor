/**
 * Applicant profile readiness engine.
 *
 * Computes a readiness score plus three categories of findings:
 *  - blocking: prevents submitting a rental application (enforced server-side)
 *  - missing: strongly expected by landlords; lowers the score significantly
 *  - warnings: recommended improvements
 */

export type ReadinessDocument = {
  documentType: string
  status: string
  expiresAt: string | null
}

export type ReadinessInput = {
  identityVerified: boolean
  isAdult: boolean
  firstName: string | null
  lastName: string | null
  phone: string | null
  city: string | null
  monthlyIncome: number | null
  employmentStatus: string | null
  householdSize: number | null
  desiredMoveIn: string | null
  desiredLocations: string[]
  personalLetter: string | null
  currentHousingSituation: string | null
  documents: ReadinessDocument[]
  queueActive: boolean
}

export type ReadinessItem = {
  key: string
  label: string
  /** Where the user can fix it. */
  href: string
}

export type ReadinessResult = {
  /** 0–100 */
  score: number
  canApply: boolean
  blocking: ReadinessItem[]
  missing: ReadinessItem[]
  warnings: ReadinessItem[]
}

const USABLE_DOCUMENT_STATUSES = new Set(['active', 'pending_review'])

function isUsableDocument(document: ReadinessDocument, now: Date) {
  if (!USABLE_DOCUMENT_STATUSES.has(document.status)) return false
  if (document.expiresAt && new Date(document.expiresAt) < now) return false
  return true
}

export function calculateReadiness(input: ReadinessInput, now: Date = new Date()): ReadinessResult {
  const blocking: ReadinessItem[] = []
  const missing: ReadinessItem[] = []
  const warnings: ReadinessItem[] = []

  if (!input.identityVerified) {
    blocking.push({ key: 'identity', label: 'Verifiera din identitet', href: '/dashboard/identity' })
  } else if (!input.isAdult) {
    blocking.push({ key: 'age', label: 'Du måste vara minst 18 år för att ansöka', href: '/dashboard/identity' })
  }
  if (!input.firstName || !input.lastName) {
    blocking.push({ key: 'name', label: 'Fyll i ditt namn', href: '/dashboard/profile' })
  }
  if (!input.phone) {
    blocking.push({ key: 'phone', label: 'Fyll i ditt telefonnummer', href: '/dashboard/profile' })
  }

  const usableDocuments = input.documents.filter((doc) => isUsableDocument(doc, now))
  const hasIncomeDocument = usableDocuments.some((doc) =>
    ['income_proof', 'salary_slip', 'employment_certificate'].includes(doc.documentType),
  )

  if (!input.monthlyIncome) {
    missing.push({ key: 'income', label: 'Ange din månadsinkomst', href: '/dashboard/profile' })
  }
  if (!input.employmentStatus) {
    missing.push({ key: 'employment', label: 'Ange din sysselsättning', href: '/dashboard/profile' })
  }
  if (!input.householdSize) {
    missing.push({ key: 'household', label: 'Ange hushållsstorlek', href: '/dashboard/profile' })
  }
  if (!input.city) {
    missing.push({ key: 'city', label: 'Ange din nuvarande stad', href: '/dashboard/profile' })
  }
  if (usableDocuments.length === 0) {
    missing.push({ key: 'documents', label: 'Ladda upp minst ett dokument', href: '/dashboard/documents' })
  } else if (!hasIncomeDocument) {
    missing.push({ key: 'income_document', label: 'Ladda upp inkomstunderlag', href: '/dashboard/documents' })
  }

  if (!input.personalLetter) {
    warnings.push({ key: 'personal_letter', label: 'Skriv ett personligt brev', href: '/dashboard/profile' })
  }
  if (input.desiredLocations.length === 0) {
    warnings.push({ key: 'locations', label: 'Ange önskade områden', href: '/dashboard/profile' })
  }
  if (!input.desiredMoveIn) {
    warnings.push({ key: 'move_in', label: 'Ange önskat inflyttningsdatum', href: '/dashboard/profile' })
  }
  if (!input.currentHousingSituation) {
    warnings.push({ key: 'housing', label: 'Beskriv din nuvarande boendesituation', href: '/dashboard/profile' })
  }
  if (!input.queueActive) {
    warnings.push({ key: 'queue', label: 'Aktivera din köplats', href: '/bostadsko' })
  }

  const soonThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = input.documents.filter(
    (doc) =>
      USABLE_DOCUMENT_STATUSES.has(doc.status) &&
      doc.expiresAt &&
      new Date(doc.expiresAt) >= now &&
      new Date(doc.expiresAt) <= soonThreshold,
  )
  if (expiringSoon.length > 0) {
    warnings.push({
      key: 'expiring_documents',
      label: `${expiringSoon.length} dokument går ut inom 30 dagar`,
      href: '/dashboard/documents',
    })
  }

  const rejected = input.documents.filter((doc) => doc.status === 'rejected')
  if (rejected.length > 0) {
    warnings.push({
      key: 'rejected_documents',
      label: `${rejected.length} dokument har nekats och behöver ersättas`,
      href: '/dashboard/documents',
    })
  }

  // Score: blocking items dominate, then missing, then warnings.
  const blockingPenalty = blocking.length * 20
  const missingPenalty = missing.length * 10
  const warningPenalty = warnings.length * 4
  const score = Math.max(0, Math.min(100, 100 - blockingPenalty - missingPenalty - warningPenalty))

  return {
    score,
    canApply: blocking.length === 0,
    blocking,
    missing,
    warnings,
  }
}
