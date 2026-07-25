import { describe, expect, it } from 'vitest'
import { resolveEsignProvider } from './provider'

describe('e-sign provider resolution', () => {
  it('never enables a live adapter without complete HTTPS configuration', () => {
    expect(resolveEsignProvider({ NODE_ENV: 'production', ESIGN_PROVIDER: 'provider-x' })).toEqual({ kind: 'not_configured' })
    expect(resolveEsignProvider({
      NODE_ENV: 'production',
      ESIGN_PROVIDER: 'provider-x',
      ESIGN_BASE_URL: 'http://unsafe.example',
      ESIGN_API_KEY: 'secret',
    })).toEqual({ kind: 'not_configured' })
  })

  it('keeps mock explicitly labeled', () => {
    const result = resolveEsignProvider({ NODE_ENV: 'test', ESIGN_PROVIDER: 'mock' })
    expect(result.kind).toBe('provider')
    if (result.kind === 'provider') expect(result.provider.isMock).toBe(true)
  })
})
