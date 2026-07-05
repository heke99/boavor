import { createHmac } from 'crypto'

/**
 * Identity verification provider abstraction.
 *
 * Bovaro never fakes identity verification in production:
 *  - The mock provider is only active when explicitly enabled via
 *    IDENTITY_PROVIDER=mock or in local development.
 *  - The BankID provider requires full configuration; otherwise
 *    getIdentityProvider() returns null and the UI shows
 *    "BankID-verifiering är inte konfigurerad".
 */

export type IdentityProviderName = 'mock' | 'bankid'

export type IdentityStartResult = {
  sessionId: string
  /** For BankID: token used to open the BankID app. */
  autoStartToken?: string
}

export type IdentityCheckResult =
  | { status: 'pending'; hint?: string }
  | {
      status: 'complete'
      /**
       * The verified personal identity number, when the provider returns it
       * (BankID does). The mock provider returns null — the number was already
       * validated, hashed and stored at start.
       */
      personalIdentityNumber: string | null
      fullName: string | null
    }
  | { status: 'failed'; reason: string }

export type IdentityCheckContext = {
  /** When the verification session was started (from our database). */
  startedAt: Date
}

export interface IdentityProvider {
  readonly name: IdentityProviderName
  /** Human label shown in UI. */
  readonly label: string
  /** True when this provider is a non-production stand-in. */
  readonly isMock: boolean
  start(params: { userId: string; endUserIp?: string | null }): Promise<IdentityStartResult>
  check(sessionId: string, context: IdentityCheckContext): Promise<IdentityCheckResult>
  cancel(sessionId: string): Promise<void>
}

export function isBankIdConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.BANKID_API_URL && env.BANKID_CLIENT_CERT && env.BANKID_CLIENT_KEY)
}

export type IdentityProviderResolution =
  | { kind: 'provider'; provider: IdentityProvider }
  | { kind: 'not_configured' }

/**
 * Resolves the active identity provider.
 *
 * - `IDENTITY_PROVIDER=bankid` or complete BankID env config → BankID provider.
 * - `IDENTITY_PROVIDER=mock` (any env) or local development → labeled mock.
 * - Otherwise → not configured; callers must show a clear Swedish message and
 *   never fake success.
 */
export async function resolveIdentityProvider(
  env: NodeJS.ProcessEnv = process.env,
): Promise<IdentityProviderResolution> {
  const explicit = env.IDENTITY_PROVIDER?.trim().toLowerCase()

  if (explicit === 'bankid' || (!explicit && isBankIdConfigured(env))) {
    if (!isBankIdConfigured(env)) return { kind: 'not_configured' }
    const { BankIdProvider } = await import('./bankid-provider')
    return {
      kind: 'provider',
      provider: new BankIdProvider({
        BANKID_API_URL: env.BANKID_API_URL,
        BANKID_CLIENT_CERT: env.BANKID_CLIENT_CERT,
        BANKID_CLIENT_KEY: env.BANKID_CLIENT_KEY,
        BANKID_CA_CERT: env.BANKID_CA_CERT,
      }),
    }
  }

  if (explicit === 'mock' || (!explicit && env.NODE_ENV === 'development')) {
    const { MockIdentityProvider } = await import('./mock-provider')
    return { kind: 'provider', provider: new MockIdentityProvider() }
  }

  return { kind: 'not_configured' }
}

/**
 * HMAC hash of a normalized personal identity number. The raw number is never
 * stored; this hash supports duplicate-identity detection and re-verification.
 */
export function hashPersonalIdentityNumber(normalized: string, env: NodeJS.ProcessEnv = process.env) {
  const secret = env.IDENTITY_HASH_SECRET || env.RATE_LIMIT_SECRET || 'bovaro-development-identity'
  return createHmac('sha256', secret).update(normalized).digest('hex')
}
