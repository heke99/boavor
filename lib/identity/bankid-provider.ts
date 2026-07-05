import type { IdentityCheckResult, IdentityProvider, IdentityStartResult } from './provider'

/**
 * Production BankID adapter (RP API v6).
 *
 * Requires:
 *  - BANKID_API_URL   e.g. https://appapi2.bankid.com (or test: appapi2.test.bankid.com)
 *  - BANKID_CLIENT_CERT / BANKID_CLIENT_KEY  RP certificate (PEM)
 *  - BANKID_CA_CERT   BankID server CA (PEM)
 *
 * BankID requires mutual TLS. Next.js server runtimes do not expose a global
 * fetch with client-certificate support, so the calls use node:https directly.
 *
 * This adapter never simulates success: any configuration or transport error
 * surfaces as a failed check with a clear reason.
 */

type BankIdEnv = {
  BANKID_API_URL?: string
  BANKID_CLIENT_CERT?: string
  BANKID_CLIENT_KEY?: string
  BANKID_CA_CERT?: string
}

export class BankIdProvider implements IdentityProvider {
  readonly name = 'bankid' as const
  readonly label = 'BankID'
  readonly isMock = false

  private readonly apiUrl: string
  private readonly cert: string
  private readonly key: string
  private readonly ca: string | undefined

  constructor(env: BankIdEnv) {
    if (!env.BANKID_API_URL || !env.BANKID_CLIENT_CERT || !env.BANKID_CLIENT_KEY) {
      throw new Error('BankID är inte konfigurerat: BANKID_API_URL, BANKID_CLIENT_CERT och BANKID_CLIENT_KEY krävs.')
    }
    this.apiUrl = env.BANKID_API_URL.replace(/\/$/, '')
    this.cert = env.BANKID_CLIENT_CERT
    this.key = env.BANKID_CLIENT_KEY
    this.ca = env.BANKID_CA_CERT
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const { request } = await import('node:https')
    const payload = JSON.stringify(body)
    const url = new URL(`${this.apiUrl}${path}`)

    return new Promise<T>((resolve, reject) => {
      const req = request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          cert: this.cert,
          key: this.key,
          ca: this.ca,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 15_000,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8')
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`BankID ${path} misslyckades (${res.statusCode}): ${text.slice(0, 200)}`))
              return
            }
            try {
              resolve(JSON.parse(text) as T)
            } catch {
              reject(new Error(`BankID ${path} returnerade ogiltigt svar.`))
            }
          })
        },
      )
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy(new Error('BankID-anropet tog för lång tid.'))
      })
      req.write(payload)
      req.end()
    })
  }

  async start(params: { userId: string; endUserIp?: string | null }): Promise<IdentityStartResult> {
    const response = await this.post<{ orderRef: string; autoStartToken?: string }>('/rp/v6.0/auth', {
      endUserIp: params.endUserIp ?? '127.0.0.1',
      requirement: { pinCode: true },
    })
    return { sessionId: response.orderRef, autoStartToken: response.autoStartToken }
  }

  async check(sessionId: string): Promise<IdentityCheckResult> {
    const response = await this.post<{
      status: 'pending' | 'complete' | 'failed'
      hintCode?: string
      completionData?: {
        user?: { personalNumber?: string; name?: string }
      }
    }>('/rp/v6.0/collect', { orderRef: sessionId })

    if (response.status === 'complete') {
      const personalNumber = response.completionData?.user?.personalNumber
      if (!personalNumber) {
        return { status: 'failed', reason: 'missing_completion_data' }
      }
      return {
        status: 'complete',
        personalIdentityNumber: personalNumber,
        fullName: response.completionData?.user?.name ?? null,
      }
    }

    if (response.status === 'failed') {
      return { status: 'failed', reason: response.hintCode ?? 'unknown' }
    }

    return { status: 'pending', hint: response.hintCode }
  }

  async cancel(sessionId: string): Promise<void> {
    await this.post('/rp/v6.0/cancel', { orderRef: sessionId })
  }
}
