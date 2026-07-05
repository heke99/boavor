/**
 * Screening provider abstraction (credit/debt/background checks).
 *
 * Production requires SCREENING_PROVIDER + SCREENING_API_KEY. Without
 * configuration, checks return null ("could not be verified") — Matchkoll
 * then reports the rule as unverifiable instead of faking a pass. The mock
 * provider is only used when explicitly enabled outside production flows.
 */

export type ScreeningResult = {
  /** null = could not be verified. */
  hasActiveDebt: boolean | null
  provider: string | null
  checkedAt: string | null
}

export interface ScreeningProvider {
  readonly name: string
  readonly isMock: boolean
  /** Debt check keyed by the hashed personal identity number. */
  checkDebt(personalIdentityNumberHash: string): Promise<ScreeningResult>
}

export const UNVERIFIED_SCREENING: ScreeningResult = {
  hasActiveDebt: null,
  provider: null,
  checkedAt: null,
}

class MockScreeningProvider implements ScreeningProvider {
  readonly name = 'mock'
  readonly isMock = true

  async checkDebt(): Promise<ScreeningResult> {
    // The mock always reports "no active debt" and labels itself clearly.
    return { hasActiveDebt: false, provider: 'mock', checkedAt: new Date().toISOString() }
  }
}

export function getScreeningProvider(env: NodeJS.ProcessEnv = process.env): ScreeningProvider | null {
  const provider = env.SCREENING_PROVIDER?.trim().toLowerCase()

  if (provider === 'mock' && env.NODE_ENV !== 'production') {
    return new MockScreeningProvider()
  }

  // Production adapters (credit bureaus / Kronofogden integrations) are added
  // here when a provider agreement exists. Never fake results.
  return null
}
