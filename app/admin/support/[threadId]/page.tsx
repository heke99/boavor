import Link from 'next/link'
import { ArrowLeft, Eye, Lock } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ threadId: string }> }

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

/**
 * Read-only support view of one conversation. RLS only returns rows while the
 * signed-in admin holds an active, unrevoked support_access_grant for the
 * thread — without one this page renders the "no access" state. Every open
 * is written to the admin audit log.
 */
export default async function AdminSupportThreadPage({ params }: Props) {
  const { threadId } = await params
  const { supabase, user } = await requireAdminUser()

  const { data: thread } = await supabase
    .from('message_threads')
    .select('id, thread_type, subject, locked_at, response_deadline_at, created_at, last_message_at')
    .eq('id', threadId)
    .maybeSingle()

  if (!thread) {
    return (
      <AdminShell activePath="/admin/support" title="Supportläge" description="Läsvy för en konversation.">
        <Card className="p-8 text-center">
          <Lock size={28} className="mx-auto text-[#9ca3af]" />
          <h2 className="mt-4 text-xl font-semibold text-[#111827]">Ingen aktiv åtkomst</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7280]">
            Du saknar en aktiv supportåtkomst för den här konversationen, eller så finns den inte. Skapa en motiverad
            åtkomst på supportsidan.
          </p>
          <Link
            href="/admin/support"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#5b3df5] px-5 py-3 text-sm font-semibold !text-white hover:bg-[#4c31d8]"
          >
            <ArrowLeft size={15} />
            Till supportläget
          </Link>
        </Card>
      </AdminShell>
    )
  }

  const [{ data: participants }, { data: messages }] = await Promise.all([
    supabase
      .from('message_participants')
      .select('id, user_id, participant_role, display_name, last_read_at')
      .eq('thread_id', threadId),
    supabase
      .from('messages')
      .select('id, sender_user_id, body, created_at, message_attachments(id, file_name, content_type, size_bytes)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
  ])

  // Every support-mode open of message content is audited.
  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'support_thread_viewed',
    targetType: 'message_thread',
    targetId: threadId,
    metadata: { message_count: (messages ?? []).length },
  })

  const nameByUser = new Map<string, string>()
  for (const participant of participants ?? []) {
    nameByUser.set(participant.user_id, participant.display_name ?? `Användare ${participant.user_id.slice(0, 8)}…`)
  }

  return (
    <AdminShell
      activePath="/admin/support"
      title={`Läsvy: ${thread.subject}`}
      description="Skrivskyddad supportvy. Öppningen har loggats i granskningsloggen."
    >
      <Card className="border border-[#fde68a] bg-[#fffbeb] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#92400e]">
          <Eye size={16} />
          Supportläge: läsåtkomst. Du kan inte skriva i konversationen och åtkomsten upphör automatiskt.
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Deltagare</h2>
          <div className="mt-3 space-y-2">
            {(participants ?? []).map((participant) => (
              <div key={participant.id} className="rounded-xl border border-[#e8ebf3] p-3 text-sm">
                <div className="font-semibold text-[#111827]">{nameByUser.get(participant.user_id)}</div>
                <div className="mt-1 text-xs text-[#6b7280]">
                  {participant.participant_role} · läst {formatDateTime(participant.last_read_at)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#eef0f6] pt-4 text-xs text-[#6b7280]">
            <div>Skapad {formatDateTime(thread.created_at)}</div>
            <div className="mt-1">Senaste aktivitet {formatDateTime(thread.last_message_at)}</div>
            {thread.locked_at ? <div className="mt-1 font-semibold text-[#b45309]">Låst {formatDateTime(thread.locked_at)}</div> : null}
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            {(messages ?? []).map((message) => (
              <div key={message.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6b7280]">
                  <span className="font-semibold text-[#111827]">{nameByUser.get(message.sender_user_id) ?? 'Okänd avsändare'}</span>
                  <span>{formatDateTime(message.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#374151]">{message.body}</p>
                {message.message_attachments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.message_attachments.map((attachment) => (
                      <span key={attachment.id} className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                        {attachment.file_name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {!messages?.length ? <p className="text-sm text-[#6b7280]">Konversationen innehåller inga meddelanden.</p> : null}
          </div>
        </Card>
      </div>
    </AdminShell>
  )
}
