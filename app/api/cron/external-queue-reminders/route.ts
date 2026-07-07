import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import { sendTemplatedEmail } from '@/lib/email/send'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const REMINDER_TITLES: Record<string, string> = {
  renewal: 'Dags att förnya din externa bostadskö',
  annual_fee: 'Årsavgift för extern bostadskö',
  profile_update: 'Dags att uppdatera din köprofil',
}

/** Sends due external-queue reminders (in-app + email), once each. */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'external-queue-reminders', async (supabase) => {
    const today = new Date().toISOString().slice(0, 10)
    const siteUrl = getSiteUrl()

    const { data: dueReminders, error } = await supabase
      .from('external_queue_reminders')
      .select('id, user_id, reminder_type, membership_id')
      .lte('remind_at', today)
      .is('sent_at', null)
      .limit(200)

    if (error) throw new Error(error.message)

    let sent = 0
    let failed = 0

    for (const reminder of dueReminders ?? []) {
      const { data: membership } = await supabase
        .from('external_queue_memberships')
        .select('custom_provider_name, provider_id, renewal_date, external_queue_providers(name)')
        .eq('id', reminder.membership_id)
        .maybeSingle()

      const queueName =
        membership?.custom_provider_name ??
        (membership?.external_queue_providers as { name: string } | null)?.name ??
        'din externa bostadskö'

      const title = REMINDER_TITLES[reminder.reminder_type] ?? 'Köpåminnelse'

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: reminder.user_id,
        title,
        body: `${queueName}${membership?.renewal_date ? ` — förnyelse ${membership.renewal_date}` : ''}. Uppdatera dina uppgifter under Alla mina köer.`,
        category: 'queue',
        link: '/dashboard/koer',
      })

      let emailStatus: 'sent' | 'skipped' | 'failed' | 'no_email' = 'no_email'
      const { data: userInfo } = await supabase.auth.admin.getUserById(reminder.user_id)
      if (userInfo?.user?.email) {
        const result = await sendTemplatedEmail(supabase, {
          userId: reminder.user_id,
          to: userInfo.user.email,
          templateKey: 'external_queue_reminder',
          data: {
            title,
            queueName,
            renewalDate: membership?.renewal_date ?? null,
            manageUrl: `${siteUrl}/dashboard/koer`,
          },
        })
        emailStatus = result.status
      }

      // Mark sent only when the user was reached on at least one channel.
      // If both the in-app notification and the email failed, the row keeps
      // sent_at = null so the next run retries it. Email-only failures are
      // already surfaced via email_events/integration_failures; retrying them
      // here would duplicate the in-app notification.
      const delivered = !notificationError || emailStatus === 'sent' || emailStatus === 'skipped'
      if (!delivered) {
        failed += 1
        continue
      }

      await supabase
        .from('external_queue_reminders')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', reminder.id)

      sent += 1
    }

    return { sent, failed }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
