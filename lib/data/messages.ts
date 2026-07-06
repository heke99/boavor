import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseStorageUri } from '@/lib/storage'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

export type ThreadListItem = {
  id: string
  subject: string
  threadType: string
  applicationId: string | null
  lastMessageAt: string
  lockedAt: string | null
  responseDeadlineAt: string | null
  unreadCount: number
  myRole: string
}

export type ThreadMessage = {
  id: string
  senderUserId: string
  senderName: string
  body: string
  createdAt: string
  attachments: Array<{ id: string; fileName: string; url: string }>
}

export type ThreadDetail = {
  id: string
  subject: string
  threadType: string
  applicationId: string | null
  lockedAt: string | null
  responseDeadlineAt: string | null
  myRole: string
  messages: ThreadMessage[]
  participants: Array<{ userId: string; role: string; displayName: string | null }>
}

/** Threads for the signed-in user with unread counts. */
export async function getThreads(supabase: SupabaseServerClient, userId: string, search?: string): Promise<ThreadListItem[]> {
  const { data: participantRows } = await supabase
    .from('message_participants')
    .select('thread_id, participant_role, last_read_at')
    .eq('user_id', userId)

  const threadIds = (participantRows ?? []).map((row) => row.thread_id)
  if (threadIds.length === 0) return []

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, subject, thread_type, application_id, last_message_at, locked_at, response_deadline_at')
    .in('id', threadIds)
    .order('last_message_at', { ascending: false })

  // Message search within own threads only.
  let matchingThreadIds: Set<string> | null = null
  if (search && search.trim()) {
    const { data: matches } = await supabase
      .from('messages')
      .select('thread_id')
      .in('thread_id', threadIds)
      .ilike('body', `%${search.trim()}%`)
    matchingThreadIds = new Set((matches ?? []).map((row) => row.thread_id))
  }

  const participantMap = new Map((participantRows ?? []).map((row) => [row.thread_id, row]))

  const result: ThreadListItem[] = []
  for (const thread of threads ?? []) {
    if (matchingThreadIds && !matchingThreadIds.has(thread.id) && !thread.subject.toLowerCase().includes((search ?? '').toLowerCase())) {
      continue
    }

    const participant = participantMap.get(thread.id)
    const lastRead = participant?.last_read_at ?? null

    let unreadQuery = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .neq('sender_user_id', userId)
    if (lastRead) unreadQuery = unreadQuery.gt('created_at', lastRead)
    const { count } = await unreadQuery

    result.push({
      id: thread.id,
      subject: thread.subject,
      threadType: thread.thread_type,
      applicationId: thread.application_id,
      lastMessageAt: thread.last_message_at,
      lockedAt: thread.locked_at,
      responseDeadlineAt: thread.response_deadline_at,
      unreadCount: count ?? 0,
      myRole: participant?.participant_role ?? 'member',
    })
  }

  return result
}

export async function getThreadDetail(
  supabase: SupabaseServerClient,
  userId: string,
  threadId: string,
): Promise<ThreadDetail | null> {
  const { data: thread } = await supabase
    .from('message_threads')
    .select('id, subject, thread_type, application_id, locked_at, response_deadline_at')
    .eq('id', threadId)
    .maybeSingle()

  if (!thread) return null

  const [{ data: participants }, { data: messages }] = await Promise.all([
    supabase
      .from('message_participants')
      .select('user_id, participant_role, display_name')
      .eq('thread_id', threadId),
    supabase
      .from('messages')
      .select('id, sender_user_id, body, created_at, message_attachments(id, file_name, file_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  const myParticipant = (participants ?? []).find((participant) => participant.user_id === userId)
  if (!myParticipant) return null

  const roleName = (senderId: string) => {
    const participant = (participants ?? []).find((item) => item.user_id === senderId)
    if (participant?.display_name) return participant.display_name
    if (senderId === userId) return 'Du'
    return participant?.participant_role === 'landlord' ? 'Hyresvärden' : participant?.participant_role === 'support' ? 'Bovaro support' : 'Sökande'
  }

  return {
    id: thread.id,
    subject: thread.subject,
    threadType: thread.thread_type,
    applicationId: thread.application_id,
    lockedAt: thread.locked_at,
    responseDeadlineAt: thread.response_deadline_at,
    myRole: myParticipant.participant_role,
    participants: (participants ?? []).map((participant) => ({
      userId: participant.user_id,
      role: participant.participant_role,
      displayName: participant.display_name,
    })),
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      senderUserId: message.sender_user_id,
      senderName: roleName(message.sender_user_id),
      body: message.body,
      createdAt: message.created_at,
      attachments: (message.message_attachments ?? []).map((attachment) => ({
        id: attachment.id,
        fileName: attachment.file_name,
        url: parseStorageUri(attachment.file_url) ? `/dashboard/messages/attachments/${attachment.id}/view` : attachment.file_url,
      })),
    })),
  }
}
