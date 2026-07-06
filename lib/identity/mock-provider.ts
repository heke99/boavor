import { randomUUID } from 'crypto'
import type { IdentityCheckContext, IdentityCheckResult, IdentityProvider, IdentityStartResult } from './provider'

/**
 * Development/staging stand-in for BankID.
 *
 * The mock completes a verification a few seconds after start so that the UI
 * polling flow behaves like the real provider. It is clearly labeled as a
 * mock in the UI and is never selected in production unless the operator
 * explicitly sets IDENTITY_PROVIDER=mock.
 */

const MOCK_COMPLETION_DELAY_MS = 3_000

export class MockIdentityProvider implements IdentityProvider {
  readonly name = 'mock' as const
  readonly label = 'Mock-BankID (endast test)'
  readonly isMock = true

  async start(): Promise<IdentityStartResult> {
    return { sessionId: `mock-${randomUUID()}` }
  }

  async check(sessionId: string, context: IdentityCheckContext): Promise<IdentityCheckResult> {
    if (!sessionId.startsWith('mock-')) {
      return { status: 'failed', reason: 'invalid_session' }
    }

    const elapsed = Date.now() - context.startedAt.getTime()
    if (elapsed < MOCK_COMPLETION_DELAY_MS) {
      return { status: 'pending', hint: 'Öppna Mock-BankID… (simulerad väntetid)' }
    }

    // The personal identity number was validated, hashed and stored when the
    // mock session started; nothing sensitive travels through the provider.
    return {
      status: 'complete',
      personalIdentityNumber: null,
      fullName: null,
    }
  }

  async cancel(): Promise<void> {
    // Nothing to cancel remotely for the mock.
  }
}
