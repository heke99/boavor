import { describe, expect, it } from 'vitest'
import { getSafeNextPath } from '@/lib/url'

describe('url helpers', () => {
  it('allows internal paths', () => {
    expect(getSafeNextPath('/dashboard/settings')).toBe('/dashboard/settings')
  })

  it('blocks absolute and protocol-relative redirects', () => {
    expect(getSafeNextPath('https://evil.test')).toBe('/dashboard')
    expect(getSafeNextPath('//evil.test')).toBe('/dashboard')
  })
})
