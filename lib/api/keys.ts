import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * API key format: bov_live_<40 hex chars>. Only the sha256 hash is stored;
 * the plaintext is shown once at creation.
 */

export const API_KEY_PREFIX = 'bov_live_'

export type GeneratedApiKey = {
  /** Full secret — display once, never store. */
  secret: string
  /** First characters for identification in lists (bov_live_ab12…). */
  prefix: string
  /** sha256 hex digest stored in api_keys.key_hash. */
  hash: string
}

export function generateApiKey(): GeneratedApiKey {
  const secret = `${API_KEY_PREFIX}${randomBytes(20).toString('hex')}`
  return { secret, prefix: secret.slice(0, API_KEY_PREFIX.length + 6), hash: hashApiKey(secret) }
}

export function hashApiKey(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function isValidApiKeyFormat(secret: string): boolean {
  return new RegExp(`^${API_KEY_PREFIX}[0-9a-f]{40}$`).test(secret)
}

/** Extracts the bearer key from an Authorization header, or null. */
export function extractBearerKey(authorization: string | null): string | null {
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null
  return isValidApiKeyFormat(match[1]) ? match[1] : null
}

/** Constant-time hash comparison (both inputs are hex sha256 digests). */
export function hashesEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex')
  const bufferB = Buffer.from(b, 'hex')
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export const API_SCOPES = ['listings:read', 'applications:read'] as const
export type ApiScope = (typeof API_SCOPES)[number]

export function hasScope(scopes: string[], required: ApiScope): boolean {
  return scopes.includes(required)
}
