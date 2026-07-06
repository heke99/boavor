import { randomUUID } from 'crypto'

/**
 * E-sign provider abstraction for rental contracts.
 *
 * - Mock provider (dev/staging): signatures are collected in-app through the
 *   SECURITY DEFINER function mock_sign_contract(); clearly labeled and never
 *   valid as a production signature.
 * - Production: requires ESIGN_PROVIDER + ESIGN_API_KEY. Until a provider
 *   agreement exists, resolveEsignProvider() returns not_configured and the
 *   UI states that e-signering is not configured. Contracts are never marked
 *   signed without provider confirmation.
 */

export type EsignSigner = {
  fullName: string
  email: string | null
  role: 'applicant' | 'co_applicant' | 'guarantor' | 'landlord'
}

export type EsignRequest = {
  contractId: string
  documentText: string
  signers: EsignSigner[]
}

export type EsignCreated = {
  providerRef: string
}

export interface EsignProvider {
  readonly name: string
  readonly isMock: boolean
  createSigningRequest(request: EsignRequest): Promise<EsignCreated>
  cancel(providerRef: string): Promise<void>
}

class MockEsignProvider implements EsignProvider {
  readonly name = 'mock'
  readonly isMock = true

  async createSigningRequest(): Promise<EsignCreated> {
    return { providerRef: `mock-${randomUUID()}` }
  }

  async cancel(): Promise<void> {
    // Nothing external to cancel for the mock.
  }
}

export type EsignResolution = { kind: 'provider'; provider: EsignProvider } | { kind: 'not_configured' }

export function resolveEsignProvider(env: NodeJS.ProcessEnv = process.env): EsignResolution {
  const explicit = env.ESIGN_PROVIDER?.trim().toLowerCase()

  if (explicit === 'mock' || (!explicit && env.NODE_ENV === 'development')) {
    return { kind: 'provider', provider: new MockEsignProvider() }
  }

  // Production adapters (Scrive, Assently, etc.) are added here once an
  // agreement and API credentials exist. Never fake signatures.
  return { kind: 'not_configured' }
}
