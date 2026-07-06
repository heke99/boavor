/**
 * Support-mode guardrails (pure, tested).
 *
 * Admins never impersonate users. Instead they request time-limited,
 * reason-mandatory read access to a specific conversation. These helpers
 * validate the request and decide whether a grant is currently active;
 * the database enforces the same rules in RLS.
 */

export const MIN_REASON_LENGTH = 10
export const DEFAULT_GRANT_HOURS = 1
export const MAX_GRANT_HOURS = 4

export type SupportGrant = {
  expiresAt: string
  revokedAt: string | null
}

export function isGrantActive(grant: SupportGrant, now: Date = new Date()): boolean {
  if (grant.revokedAt) return false
  return new Date(grant.expiresAt).getTime() > now.getTime()
}

export function isValidReason(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH
}

/** Clamps the requested duration to [1, maxHours] whole hours. */
export function clampGrantHours(requested: number, maxHours: number = MAX_GRANT_HOURS): number {
  if (!Number.isFinite(requested) || requested < 1) return DEFAULT_GRANT_HOURS
  return Math.min(Math.floor(requested), Math.max(1, Math.floor(maxHours)))
}
