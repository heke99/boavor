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
  documentHash: string
  documentVersionId: string
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

class HttpEsignProvider implements EsignProvider {
  readonly isMock = false

  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async createSigningRequest(request: EsignRequest): Promise<EsignCreated> {
    const response = await fetch(`${this.baseUrl}/signing-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `bovaro-contract-${request.contractId}-${request.documentVersionId}`,
      },
      body: JSON.stringify({
        external_id: request.contractId,
        document_hash: request.documentHash,
        document_version_id: request.documentVersionId,
        signers: request.signers,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`E-sign provider returned HTTP ${response.status}`)
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object' || !('id' in payload) || typeof payload.id !== 'string') {
      throw new Error('E-sign provider response is missing id')
    }
    return { providerRef: payload.id }
  }

  async cancel(providerRef: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/signing-sessions/${encodeURIComponent(providerRef)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`E-sign cancellation returned HTTP ${response.status}`)
    }
  }
}

export type EsignResolution = { kind: 'provider'; provider: EsignProvider } | { kind: 'not_configured' }

export function resolveEsignProvider(env: NodeJS.ProcessEnv = process.env): EsignResolution {
  const explicit = env.ESIGN_PROVIDER?.trim().toLowerCase()

  if (explicit === 'mock' || (!explicit && env.NODE_ENV === 'development')) {
    return { kind: 'provider', provider: new MockEsignProvider() }
  }

  const baseUrl = env.ESIGN_BASE_URL?.trim().replace(/\/+$/, '')
  const apiKey = env.ESIGN_API_KEY?.trim()
  if (explicit && explicit !== 'mock' && baseUrl && apiKey) {
    const url = new URL(baseUrl)
    if (url.protocol !== 'https:') return { kind: 'not_configured' }
    return { kind: 'provider', provider: new HttpEsignProvider(explicit, baseUrl, apiKey) }
  }

  return { kind: 'not_configured' }
}
