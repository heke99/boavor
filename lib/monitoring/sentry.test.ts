import { describe, expect, it } from 'vitest'
import { buildSentryEvent, parseSentryDsn } from './sentry'

describe('parseSentryDsn', () => {
  it('parses a standard DSN', () => {
    const parsed = parseSentryDsn('https://abc123@o450.ingest.sentry.io/4505')
    expect(parsed).toEqual({ publicKey: 'abc123', host: 'o450.ingest.sentry.io', projectId: '4505' })
  })

  it('returns null for missing or malformed DSNs', () => {
    expect(parseSentryDsn(undefined)).toBeNull()
    expect(parseSentryDsn('')).toBeNull()
    expect(parseSentryDsn('not-a-url')).toBeNull()
    expect(parseSentryDsn('https://host.without.key/123')).toBeNull()
    expect(parseSentryDsn('https://key@host.io/not-numeric')).toBeNull()
  })
})

describe('buildSentryEvent', () => {
  it('captures error type and masked message', () => {
    const event = buildSentryEvent(new TypeError('failed for a@b.se'), { path: '/dashboard', method: 'GET' }, 'production')
    expect(event.exception.values[0].type).toBe('TypeError')
    expect(event.exception.values[0].value).toBe('failed for [email]')
    expect(event.environment).toBe('production')
    expect(event.extra.path).toBe('/dashboard')
    expect(event.event_id).toMatch(/^[a-f0-9]{32}$/)
  })

  it('wraps non-Error values', () => {
    const event = buildSentryEvent('boom', {}, 'development')
    expect(event.exception.values[0].value).toBe('boom')
  })
})
