/** Support SLA rules (pure, tested). */

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

/** First-response target per priority, in hours. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 72,
}

export function slaDueAt(priority: TicketPriority, createdAt: Date): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * 60 * 60 * 1000)
}

export type SlaState = 'met' | 'on_track' | 'at_risk' | 'breached'

/**
 * SLA state for a ticket: met once first response exists; otherwise
 * breached when past due, at_risk within the last 25% of the window.
 */
export function slaState(params: {
  priority: TicketPriority
  createdAt: Date
  firstResponseAt: Date | null
  now: Date
}): SlaState {
  const due = slaDueAt(params.priority, params.createdAt)
  if (params.firstResponseAt) {
    return params.firstResponseAt.getTime() <= due.getTime() ? 'met' : 'breached'
  }
  if (params.now.getTime() > due.getTime()) return 'breached'
  const windowMs = due.getTime() - params.createdAt.getTime()
  const remainingMs = due.getTime() - params.now.getTime()
  return remainingMs <= windowMs * 0.25 ? 'at_risk' : 'on_track'
}
