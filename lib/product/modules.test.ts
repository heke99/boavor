import { describe, expect, it } from 'vitest'
import { getEnabledModules, isModuleEnabled, parseModuleOverride } from './modules'

describe('parseModuleOverride', () => {
  it('parses truthy values', () => {
    expect(parseModuleOverride('true')).toBe(true)
    expect(parseModuleOverride('1')).toBe(true)
    expect(parseModuleOverride('on')).toBe(true)
    expect(parseModuleOverride('YES')).toBe(true)
  })

  it('parses falsy values', () => {
    expect(parseModuleOverride('false')).toBe(false)
    expect(parseModuleOverride('0')).toBe(false)
    expect(parseModuleOverride('off')).toBe(false)
    expect(parseModuleOverride('No')).toBe(false)
  })

  it('returns null for unknown or missing values', () => {
    expect(parseModuleOverride(undefined)).toBeNull()
    expect(parseModuleOverride(null)).toBeNull()
    expect(parseModuleOverride('')).toBeNull()
    expect(parseModuleOverride('maybe')).toBeNull()
  })
})

describe('isModuleEnabled', () => {
  it('uses defaults when no override exists', () => {
    expect(isModuleEnabled('rentalMarketplace', {} as NodeJS.ProcessEnv)).toBe(true)
    // Byta shipped in Batch 12 and is on by default; publicApi is still off.
    expect(isModuleEnabled('bovaroByta', {} as NodeJS.ProcessEnv)).toBe(true)
    expect(isModuleEnabled('publicApi', {} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('honours environment overrides in both directions', () => {
    expect(
      isModuleEnabled('bovaroByta', { NEXT_PUBLIC_MODULE_BOVARO_BYTA: 'false' } as unknown as NodeJS.ProcessEnv),
    ).toBe(false)
    expect(
      isModuleEnabled('rentalMarketplace', {
        NEXT_PUBLIC_MODULE_RENTAL_MARKETPLACE: 'false',
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(false)
  })

  it('ignores invalid override values', () => {
    expect(
      isModuleEnabled('saleMarketplace', { NEXT_PUBLIC_MODULE_SALE_MARKETPLACE: 'banana' } as unknown as NodeJS.ProcessEnv),
    ).toBe(true)
  })
})

describe('getEnabledModules', () => {
  it('lists enabled modules with overrides applied', () => {
    const modules = getEnabledModules({ NEXT_PUBLIC_MODULE_BOVARO_PLUS: 'true' } as unknown as NodeJS.ProcessEnv)
    expect(modules).toContain('rentalMarketplace')
    expect(modules).toContain('bovaroPlus')
    expect(modules).not.toContain('publicApi')
  })
})
