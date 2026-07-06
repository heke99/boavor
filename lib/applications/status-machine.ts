/**
 * Server-side status machine for rental applications.
 *
 * All status changes must pass canTransition() — the UI only offers valid
 * choices, but enforcement happens in server actions.
 *
 * The live database enum contains legacy values from the original schema
 * (received, reserve, viewing). They are normalized to canonical statuses
 * before evaluation and never written for new transitions.
 */

export type CanonicalApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'screening'
  | 'qualified'
  | 'not_qualified'
  | 'reviewing'
  | 'shortlisted'
  | 'viewing_invited'
  | 'viewing_booked'
  | 'offered'
  | 'offer_accepted'
  | 'contract_pending'
  | 'signed'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'rented_to_other'

export type StatusActor = 'applicant' | 'landlord' | 'system' | 'admin'

const LEGACY_ALIASES: Record<string, CanonicalApplicationStatus> = {
  received: 'submitted',
  reserve: 'shortlisted',
  viewing: 'viewing_invited',
}

export function normalizeStatus(status: string): CanonicalApplicationStatus {
  return (LEGACY_ALIASES[status] ?? status) as CanonicalApplicationStatus
}

export const TERMINAL_STATUSES: CanonicalApplicationStatus[] = [
  'signed',
  'rejected',
  'withdrawn',
  'expired',
  'rented_to_other',
]

export const ACTIVE_STATUSES: CanonicalApplicationStatus[] = [
  'submitted',
  'screening',
  'qualified',
  'not_qualified',
  'reviewing',
  'shortlisted',
  'viewing_invited',
  'viewing_booked',
  'offered',
  'offer_accepted',
  'contract_pending',
]

/** Transitions the landlord (or team) may perform. */
const LANDLORD_TRANSITIONS: Record<CanonicalApplicationStatus, CanonicalApplicationStatus[]> = {
  draft: [],
  submitted: ['screening', 'qualified', 'not_qualified', 'reviewing', 'shortlisted', 'rejected', 'expired', 'rented_to_other'],
  screening: ['qualified', 'not_qualified', 'reviewing', 'rejected', 'rented_to_other'],
  qualified: ['reviewing', 'shortlisted', 'viewing_invited', 'rejected', 'rented_to_other'],
  not_qualified: ['reviewing', 'rejected', 'rented_to_other'],
  reviewing: ['qualified', 'not_qualified', 'shortlisted', 'viewing_invited', 'offered', 'rejected', 'rented_to_other'],
  shortlisted: ['reviewing', 'viewing_invited', 'offered', 'rejected', 'rented_to_other'],
  viewing_invited: ['viewing_booked', 'offered', 'reviewing', 'rejected', 'rented_to_other'],
  viewing_booked: ['offered', 'reviewing', 'rejected', 'rented_to_other'],
  offered: ['offer_accepted', 'rejected', 'expired', 'rented_to_other'],
  offer_accepted: ['contract_pending', 'rented_to_other'],
  contract_pending: ['signed', 'rented_to_other'],
  signed: [],
  rejected: [],
  withdrawn: [],
  expired: [],
  rented_to_other: [],
}

/** Transitions the applicant may perform. */
const APPLICANT_TRANSITIONS: Partial<Record<CanonicalApplicationStatus, CanonicalApplicationStatus[]>> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['withdrawn'],
  screening: ['withdrawn'],
  qualified: ['withdrawn'],
  not_qualified: ['withdrawn'],
  reviewing: ['withdrawn'],
  shortlisted: ['withdrawn'],
  viewing_invited: ['viewing_booked', 'withdrawn'],
  viewing_booked: ['withdrawn'],
  offered: ['offer_accepted', 'withdrawn'],
  offer_accepted: ['withdrawn'],
  contract_pending: ['withdrawn'],
}

/** System jobs (deadline close, offer expiry, contract signing). */
const SYSTEM_TRANSITIONS: Partial<Record<CanonicalApplicationStatus, CanonicalApplicationStatus[]>> = {
  submitted: ['expired', 'rented_to_other'],
  screening: ['expired', 'rented_to_other'],
  qualified: ['expired', 'rented_to_other'],
  not_qualified: ['expired', 'rented_to_other'],
  reviewing: ['expired', 'rented_to_other'],
  shortlisted: ['expired', 'rented_to_other'],
  viewing_invited: ['expired', 'rented_to_other'],
  viewing_booked: ['expired', 'rented_to_other'],
  offered: ['expired', 'rented_to_other'],
  offer_accepted: ['contract_pending', 'rented_to_other'],
  contract_pending: ['signed', 'rented_to_other'],
}

export function canTransition(from: string, to: string, actor: StatusActor): boolean {
  const fromStatus = normalizeStatus(from)
  const toStatus = normalizeStatus(to)

  if (fromStatus === toStatus) return false

  // Admins can correct any non-terminal state, and may reopen terminal
  // states only back to 'reviewing' (support corrections, audited).
  if (actor === 'admin') {
    if (TERMINAL_STATUSES.includes(fromStatus)) return toStatus === 'reviewing'
    return true
  }

  const table =
    actor === 'applicant' ? APPLICANT_TRANSITIONS : actor === 'system' ? SYSTEM_TRANSITIONS : LANDLORD_TRANSITIONS

  return (table[fromStatus] ?? []).includes(toStatus)
}

/** Statuses a given actor may move an application to (for UI dropdowns). */
export function nextStatuses(from: string, actor: StatusActor): CanonicalApplicationStatus[] {
  const fromStatus = normalizeStatus(from)
  const table =
    actor === 'applicant' ? APPLICANT_TRANSITIONS : actor === 'system' ? SYSTEM_TRANSITIONS : LANDLORD_TRANSITIONS
  return [...(table[fromStatus] ?? [])]
}

export const STATUS_LABELS_SV: Record<CanonicalApplicationStatus, string> = {
  draft: 'Utkast',
  submitted: 'Skickad',
  screening: 'Screening',
  qualified: 'Kvalificerad',
  not_qualified: 'Ej kvalificerad',
  reviewing: 'Granskas',
  shortlisted: 'Slutkandidat',
  viewing_invited: 'Inbjuden till visning',
  viewing_booked: 'Visning bokad',
  offered: 'Erbjuden bostaden',
  offer_accepted: 'Erbjudande accepterat',
  contract_pending: 'Kontrakt förbereds',
  signed: 'Kontrakt signerat',
  rejected: 'Avslagen',
  withdrawn: 'Återtagen',
  expired: 'Utgången',
  rented_to_other: 'Uthyrd till annan',
}

export function statusLabel(status: string): string {
  return STATUS_LABELS_SV[normalizeStatus(status)] ?? status
}
