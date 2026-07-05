import type { EmailMessage, EmailProvider, EmailSendResult } from './provider'

/**
 * Resend transactional email adapter (HTTPS API, no SDK dependency).
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend'

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        return { ok: false, error: `Resend ${response.status}: ${body.slice(0, 300)}` }
      }

      const data = (await response.json()) as { id?: string }
      return { ok: true, delivered: true, providerId: data.id ?? null }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown Resend error' }
    }
  }
}
