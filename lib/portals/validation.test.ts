import { describe, expect, it } from 'vitest'
import { isValidCustomDomain, isValidHexColor, isValidSlug, normalizeSlug } from './validation'

describe('normalizeSlug', () => {
  it('lowercases, transliterates and hyphenates', () => {
    expect(normalizeSlug('Örebro Bostäder AB')).toBe('orebro-bostader-ab')
    expect(normalizeSlug('  Fastighets AB   Höjden  ')).toBe('fastighets-ab-hojden')
  })

  it('strips illegal characters and trims hyphens', () => {
    expect(normalizeSlug('--Hem & Hyra!--')).toBe('hem-hyra')
  })
})

describe('isValidSlug', () => {
  it('accepts normalized slugs', () => {
    expect(isValidSlug('orebro-bostader')).toBe(true)
  })

  it('rejects short, uppercase and hyphen-edged slugs', () => {
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('Stora-Bolaget')).toBe(false)
    expect(isValidSlug('-hem')).toBe(false)
    expect(isValidSlug('hem-')).toBe(false)
  })
})

describe('isValidHexColor', () => {
  it('accepts 6-digit hex and rejects everything else', () => {
    expect(isValidHexColor('#243b8f')).toBe(true)
    expect(isValidHexColor('#fff')).toBe(false)
    expect(isValidHexColor('blue')).toBe(false)
  })
})

describe('isValidCustomDomain', () => {
  it('accepts bare hostnames', () => {
    expect(isValidCustomDomain('bostader.exempel.se')).toBe(true)
  })

  it('rejects schemes, paths and reserved hosts', () => {
    expect(isValidCustomDomain('https://exempel.se')).toBe(false)
    expect(isValidCustomDomain('exempel.se/portal')).toBe(false)
    expect(isValidCustomDomain('bovaro.se', ['bovaro.se'])).toBe(false)
    expect(isValidCustomDomain('portal.bovaro.se', ['bovaro.se'])).toBe(false)
  })
})
