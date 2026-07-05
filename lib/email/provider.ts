/**
 * Email provider abstraction.
 *
 * Production: Resend (requires RESEND_API_KEY + EMAIL_FROM).
 * Development: console provider that logs instead of sending and reports
 * `delivered: false` so callers never pretend an email was sent.
 */

export type EmailMessage = {
  to: string
  subject: string
  /** Plain text body (always required — accessible fallback). */
  text: string
  html?: string
}

export type EmailSendResult =
  | { ok: true; delivered: true; providerId: string | null }
  | { ok: true; delivered: false; reason: 'dev_console' }
  | { ok: false; error: string }

export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<EmailSendResult>
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console'

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info(`[email:dev] To: ${message.to} | Subject: ${message.subject}`)
    return { ok: true, delivered: false, reason: 'dev_console' }
  }
}

export function isEmailConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)
}

export async function getEmailProvider(env: NodeJS.ProcessEnv = process.env): Promise<EmailProvider> {
  if (isEmailConfigured(env)) {
    const { ResendEmailProvider } = await import('./resend')
    return new ResendEmailProvider(env.RESEND_API_KEY as string, env.EMAIL_FROM as string)
  }
  return new ConsoleEmailProvider()
}
