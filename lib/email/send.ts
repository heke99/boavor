import { getEmailProvider } from '@/lib/email/provider'
import { EMAIL_TEMPLATES, type EmailCategory, type EmailTemplateKey } from '@/lib/email/templates'
import type { createSupabaseServiceClient } from '@/lib/supabase/service'

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

const CATEGORY_PREFERENCE_COLUMN: Record<EmailCategory, string | null> = {
  applications: 'email_applications',
  messages: 'email_messages',
  queue: 'email_queue',
  saved_searches: 'email_saved_searches',
  byta: 'email_byta',
  marketing: 'email_marketing',
  digest: 'weekly_digest',
}

/**
 * Sends a templated email respecting the recipient's notification
 * preferences and logs the outcome to email_events. Service-role only
 * (cron jobs, webhooks).
 */
export async function sendTemplatedEmail<K extends EmailTemplateKey>(
  supabase: ServiceClient,
  params: {
    userId: string | null
    to: string
    templateKey: K
    data: Parameters<(typeof EMAIL_TEMPLATES)[K]['subject']>[0]
  },
): Promise<{ status: 'sent' | 'skipped' | 'failed' }> {
  const template = EMAIL_TEMPLATES[params.templateKey]
  const subject = template.subject(params.data as never)
  const text = template.text(params.data as never)

  // Preference check (defaults allow everything except marketing).
  let skipReason: string | null = null
  if (params.userId) {
    const preferenceColumn = CATEGORY_PREFERENCE_COLUMN[template.category]
    if (preferenceColumn) {
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', params.userId)
        .maybeSingle()

      if (preferences && (preferences as Record<string, unknown>)[preferenceColumn] === false) {
        skipReason = `preference_${preferenceColumn}_disabled`
      }
      if (!preferences && template.category === 'marketing') {
        skipReason = 'marketing_requires_opt_in'
      }
    }
  }

  if (skipReason) {
    await supabase.from('email_events').insert({
      user_id: params.userId,
      to_email: params.to,
      template_key: params.templateKey,
      subject,
      status: 'skipped',
      skip_reason: skipReason,
    })
    return { status: 'skipped' }
  }

  const provider = await getEmailProvider()
  const result = await provider.send({ to: params.to, subject, text })

  const status: 'sent' | 'skipped' | 'failed' = result.ok ? (result.delivered ? 'sent' : 'skipped') : 'failed'

  await supabase.from('email_events').insert({
    user_id: params.userId,
    to_email: params.to,
    template_key: params.templateKey,
    subject,
    status,
    skip_reason: result.ok && !result.delivered ? 'dev_console' : null,
    provider: provider.name,
    provider_message_id: result.ok && result.delivered ? result.providerId : null,
    error: result.ok ? null : result.error,
  })

  // Surface delivery failures on the ops dashboard (no recipient PII).
  if (!result.ok) {
    await supabase.from('integration_failures').insert({
      integration: 'resend',
      operation: `send:${params.templateKey}`,
      error: result.error.slice(0, 500),
      context: { template_key: params.templateKey },
    })
  }

  return { status }
}
