import { describe, expect, it } from 'vitest'
import { createContractPdf, sha256Hex } from './pdf'

describe('canonical contract PDF', () => {
  it('is deterministic and contains a valid PDF cross-reference', () => {
    const first = createContractPdf('HYRESAVTAL\nHyresgäst: Test')
    const second = createContractPdf('HYRESAVTAL\nHyresgäst: Test')
    expect(Buffer.from(first).subarray(0, 8).toString()).toBe('%PDF-1.4')
    expect(Buffer.from(first).toString('latin1')).toContain('startxref')
    expect(sha256Hex(first)).toBe(sha256Hex(second))
    expect(sha256Hex(first)).toMatch(/^[a-f0-9]{64}$/)
  })
})
