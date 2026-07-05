import { describe, expect, it } from 'vitest'
import { getPostLoginPath, isLandlordEntry } from './entry'

describe('isLandlordEntry', () => {
  it('treats company accounts as landlords regardless of role', () => {
    expect(isLandlordEntry({ role: 'seeker', accountType: 'company' })).toBe(true)
  })

  it('treats landlord-type roles as landlords', () => {
    expect(isLandlordEntry({ role: 'landlord', accountType: 'private' })).toBe(true)
    expect(isLandlordEntry({ role: 'broker', accountType: 'private' })).toBe(true)
    expect(isLandlordEntry({ role: 'company_admin', accountType: 'private' })).toBe(true)
  })

  it('treats seekers as non-landlords', () => {
    expect(isLandlordEntry({ role: 'seeker', accountType: 'private' })).toBe(false)
    expect(isLandlordEntry({ role: null, accountType: null })).toBe(false)
  })
})

describe('getPostLoginPath', () => {
  it('prefers an explicit next path', () => {
    expect(
      getPostLoginPath({ role: 'seeker', accountType: 'private', onboardingCompleted: true }, '/listing/x/apply'),
    ).toBe('/listing/x/apply')
  })

  it('sends admins to the admin panel', () => {
    expect(getPostLoginPath({ role: 'admin', accountType: 'private', onboardingCompleted: true })).toBe('/admin')
    expect(getPostLoginPath({ role: 'super_admin', accountType: 'private', onboardingCompleted: false })).toBe('/admin')
  })

  it('sends landlords to the listings workspace with onboarding hint', () => {
    expect(getPostLoginPath({ role: 'company_admin', accountType: 'company', onboardingCompleted: true })).toBe(
      '/dashboard/listings',
    )
    expect(getPostLoginPath({ role: 'company_admin', accountType: 'company', onboardingCompleted: false })).toBe(
      '/dashboard/listings?onboarding=1',
    )
  })

  it('sends seekers to the dashboard or profile onboarding', () => {
    expect(getPostLoginPath({ role: 'seeker', accountType: 'private', onboardingCompleted: true })).toBe('/dashboard')
    expect(getPostLoginPath({ role: 'seeker', accountType: 'private', onboardingCompleted: false })).toBe(
      '/dashboard/profile?onboarding=1',
    )
  })

  it('ignores the default next value so role routing can apply', () => {
    expect(getPostLoginPath({ role: 'admin', accountType: 'private', onboardingCompleted: true }, '/dashboard')).toBe(
      '/admin',
    )
  })
})
