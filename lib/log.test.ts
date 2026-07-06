import { describe, expect, it } from 'vitest'
import { maskPiiInText, sanitizeForLog } from './log'

describe('maskPiiInText', () => {
  it('masks email addresses', () => {
    expect(maskPiiInText('user anna.svensson+test@example.se failed')).toBe('user [email] failed')
  })

  it('masks personnummer with and without separator', () => {
    expect(maskPiiInText('pnr 19900101-1234')).toBe('pnr [personnummer]')
    expect(maskPiiInText('pnr 9001011234')).toBe('pnr [personnummer]')
  })

  it('masks phone numbers', () => {
    expect(maskPiiInText('ring 070-123 45 67 nu')).toBe('ring [phone] nu')
  })
})

describe('sanitizeForLog', () => {
  it('redacts values under sensitive keys', () => {
    const result = sanitizeForLog({ email: 'a@b.se', note: 'ok', phone: '0701234567' }) as Record<string, unknown>
    expect(result.email).toBe('[redacted]')
    expect(result.phone).toBe('[redacted]')
    expect(result.note).toBe('ok')
  })

  it('masks PII inside nested strings', () => {
    const result = sanitizeForLog({ meta: { message: 'kontakta a@b.se' } }) as { meta: { message: string } }
    expect(result.meta.message).toBe('kontakta [email]')
  })

  it('serializes errors without stack traces', () => {
    const result = sanitizeForLog(new Error('failed for a@b.se')) as { name: string; message: string }
    expect(result.name).toBe('Error')
    expect(result.message).toBe('failed for [email]')
  })

  it('caps recursion depth', () => {
    type Nested = { next?: Nested }
    const deep: Nested = {}
    let cursor = deep
    for (let i = 0; i < 10; i += 1) {
      cursor.next = {}
      cursor = cursor.next
    }
    expect(() => sanitizeForLog(deep)).not.toThrow()
  })
})
