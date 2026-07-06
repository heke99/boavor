import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getEmailProvider } from '@/lib/email/provider'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const REMINDER_TITLES: Record<string, string> = {
  renewal: 'Dags att förnya din externa bostadskö',
  annual_fee: 'Årsavgift för extern bostadskö',
  profile_update: 'Dags att uppdatera din köprofil',
}

/** Sends due external-queue reminders (in-app + email), once each. */
export async function POST(request: NextRequest) {
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' }, { status: 503 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: dueReminders, error } = await supabase
    .from('external_queue_reminders')
    .select('id, user_id, reminder_type, membership_id')
    .lte('remind_at', today)
    .is('sent_at', null)
    .limit(200)

  if (error) {
    console.error('external-queue-reminders query failed', error)
    return NextResponse.json({ ok: false, error: 'Datainläsning misslyckades.' }, { status: 500 })
  }

  const emailProvider = await getEmailProvider()
  const siteUrl = getSiteUrl()
  let sent = 0

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
    const body = `${queueName}${membership?.renewal_date ? ` — förnyelse ${membership.renewal_date}` : ''}. Uppdatera dina uppgifter under Alla mina köer.`

    await supabase.from('notifications').insert({
      user_id: reminder.user_id,
      title,
      body,
    })

    const { data: userInfo } = await supabase.auth.admin.getUserById(reminder.user_id)
    if (userInfo?.user?.email) {
      await emailProvider.send({
        to: userInfo.user.email,
        subject: `${title} — ${queueName}`,
        text: `Hej!\n\n${body}\n\nHantera dina köer: ${siteUrl}/dashboard/koer\n\nHälsningar,\nBovaro`,
      })
    }

    await supabase
      .from('external_queue_reminders')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', reminder.id)

    sent += 1
  }

  return NextResponse.json({ ok: true, sent })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
