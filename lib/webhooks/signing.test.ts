import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { MAX_ATTEMPTS, nextAttemptAt, signWebhookPayload } from './signing'

describe('signWebhookPayload', () => {
  it('produces a verifiable stripe-style signature', () => {
    const header = signWebhookPayload('whsec_test', '{"a":1}', 1700000000)
    expect(header).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/)

    const expected = createHmac('sha256', 'whsec_test').update('1700000000.{"a":1}').digest('hex')
    expect(header.endsWith(expected)).toBe(true)
  })

  it('changes with secret, body and timestamp', () => {
    const base = signWebhookPayload('s1', 'body', 1)
    expect(signWebhookPayload('s2', 'body', 1)).not.toBe(base)
    expect(signWebhookPayload('s1', 'other', 1)).not.toBe(base)
    expect(signWebhookPayload('s1', 'body', 2)).not.toBe(base)
  })
})

describe('nextAttemptAt', () => {
  const now = new Date('2026-07-06T12:00:00Z')

  it('backs off per attempt', () => {
    expect(nextAttemptAt(0, now)?.toISOString()).toBe('2026-07-06T12:01:00.000Z')
    expect(nextAttemptAt(1, now)?.toISOString()).toBe('2026-07-06T12:05:00.000Z')
    expect(nextAttemptAt(4, now)?.toISOString()).toBe('2026-07-07T00:00:00.000Z')
  })

  it('dead-letters after the final attempt', () => {
    expect(nextAttemptAt(MAX_ATTEMPTS, now)).toBeNull()
  })
})
