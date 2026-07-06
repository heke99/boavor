import { describe, expect, it } from 'vitest'
import {
  extractBearerKey,
  generateApiKey,
  hashApiKey,
  hashesEqual,
  hasScope,
  isValidApiKeyFormat,
} from './keys'

describe('generateApiKey', () => {
  it('produces a well-formed key with matching hash and prefix', () => {
    const key = generateApiKey()
    expect(isValidApiKeyFormat(key.secret)).toBe(true)
    expect(key.secret.startsWith(key.prefix)).toBe(true)
    expect(key.hash).toBe(hashApiKey(key.secret))
  })

  it('generates unique keys', () => {
    expect(generateApiKey().secret).not.toBe(generateApiKey().secret)
  })
})

describe('extractBearerKey', () => {
  it('extracts a valid bearer key', () => {
    const key = generateApiKey()
    expect(extractBearerKey(`Bearer ${key.secret}`)).toBe(key.secret)
  })

  it('rejects missing, malformed and non-bearer headers', () => {
    expect(extractBearerKey(null)).toBeNull()
    expect(extractBearerKey('Bearer nyckel')).toBeNull()
    expect(extractBearerKey('Basic abc123')).toBeNull()
    expect(extractBearerKey('Bearer bov_live_xyz')).toBeNull()
  })
})

describe('hashesEqual', () => {
  it('matches identical digests and rejects different ones', () => {
    const a = hashApiKey('a')
    expect(hashesEqual(a, hashApiKey('a'))).toBe(true)
    expect(hashesEqual(a, hashApiKey('b'))).toBe(false)
  })
})

describe('hasScope', () => {
  it('checks scope membership', () => {
    expect(hasScope(['listings:read'], 'listings:read')).toBe(true)
    expect(hasScope(['listings:read'], 'applications:read')).toBe(false)
  })
})
