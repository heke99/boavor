import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getEmailProvider } from '@/lib/email/provider'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const UNREAD_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

/**
 * Emails participants who have unread messages older than one hour. One
 * reminder per thread until the participant reads it (unread_reminded_at
 * gates repeats).
 */
export async function POST(request: NextRequest) {
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' }, { status: 503 })
  }

  const threshold = new Date(Date.now() - UNREAD_THRESHOLD_MS).toISOString()

  // Threads whose last message is old enough to warrant a reminder.
  const { data: threads, error } = await supabase
    .from('message_threads')
    .select('id, subject, last_message_at')
    .lte('last_message_at', threshold)
    .gte('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('unread-message-reminders query failed', error)
    return NextResponse.json({ ok: false, error: 'Datainläsning misslyckades.' }, { status: 500 })
  }

  const emailProvider = await getEmailProvider()
  const siteUrl = getSiteUrl()
  let remindersSent = 0
  let checked = 0

  for (const thread of threads ?? []) {
    const { data: participants } = await supabase
      .from('message_participants')
      .select('id, user_id, participant_role, last_read_at, unread_reminded_at')
      .eq('thread_id', thread.id)

    for (const participant of participants ?? []) {
      checked += 1

      const lastRead = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0
      const lastMessage = new Date(thread.last_message_at).getTime()
      const alreadyReminded = participant.unread_reminded_at
        ? new Date(participant.unread_reminded_at).getTime() >= lastMessage
        : false

      if (lastRead >= lastMessage || alreadyReminded) continue

      // Is the unread message from someone else?
      const { data: lastMessageRow } = await supabase
        .from('messages')
        .select('sender_user_id')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastMessageRow || lastMessageRow.sender_user_id === participant.user_id) continue

      const { data: userInfo } = await supabase.auth.admin.getUserById(participant.user_id)
      const email = userInfo?.user?.email
      if (!email) continue

      const inboxPath = participant.participant_role === 'landlord' ? '/landlord/messages' : '/dashboard/messages'
      const result = await emailProvider.send({
        to: email,
        subject: `Oläst meddelande: ${thread.subject}`,
        text: `Hej!\n\nDu har ett oläst meddelande i tråden "${thread.subject}" på Bovaro.\n\nLäs och svara här: ${siteUrl}${inboxPath}?thread=${thread.id}\n\nHälsningar,\nBovaro`,
      })

      if (result.ok) {
        await supabase
          .from('message_participants')
          .update({ unread_reminded_at: new Date().toISOString() })
          .eq('id', participant.id)
        if (result.delivered) remindersSent += 1
      }
    }
  }

  return NextResponse.json({ ok: true, threadsChecked: threads?.length ?? 0, participantsChecked: checked, remindersSent })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
