import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import { sendTemplatedEmail } from '@/lib/email/send'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const UNREAD_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

/**
 * Emails participants who have unread messages older than one hour. One
 * reminder per thread until the participant reads it (unread_reminded_at
 * gates repeats).
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'unread-message-reminders', async (supabase) => {
    const threshold = new Date(Date.now() - UNREAD_THRESHOLD_MS).toISOString()
    const siteUrl = getSiteUrl()

    const { data: threads, error } = await supabase
      .from('message_threads')
      .select('id, subject, last_message_at')
      .lte('last_message_at', threshold)
      .gte('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (error) throw new Error(error.message)

    let remindersSent = 0
    let participantsChecked = 0

    for (const thread of threads ?? []) {
      const { data: participants } = await supabase
        .from('message_participants')
        .select('id, user_id, participant_role, last_read_at, unread_reminded_at')
        .eq('thread_id', thread.id)

      for (const participant of participants ?? []) {
        participantsChecked += 1

        const lastRead = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0
        const lastMessage = new Date(thread.last_message_at).getTime()
        const alreadyReminded = participant.unread_reminded_at
          ? new Date(participant.unread_reminded_at).getTime() >= lastMessage
          : false

        if (lastRead >= lastMessage || alreadyReminded) continue

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
        const sendResult = await sendTemplatedEmail(supabase, {
          userId: participant.user_id,
          to: email,
          templateKey: 'unread_message',
          data: {
            threadSubject: thread.subject,
            threadUrl: `${siteUrl}${inboxPath}?thread=${thread.id}`,
          },
        })

        if (sendResult.status !== 'failed') {
          await supabase
            .from('message_participants')
            .update({ unread_reminded_at: new Date().toISOString() })
            .eq('id', participant.id)
          if (sendResult.status === 'sent') remindersSent += 1
        }
      }
    }

    return { threadsChecked: threads?.length ?? 0, participantsChecked, remindersSent }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
