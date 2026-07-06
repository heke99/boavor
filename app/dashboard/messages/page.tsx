import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ThreadDetailView, ThreadList } from '@/components/messaging/ThreadView'
import { Card } from '@/components/ui/Card'
import { getAuthContext } from '@/lib/auth/permissions'
import { getThreadDetail, getThreads } from '@/lib/data/messages'
import { markThreadReadAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function DashboardMessagesPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/messages' })

  const search = typeof params.q === 'string' ? params.q : undefined
  const threadId = typeof params.thread === 'string' ? params.thread : null

  const threads = await getThreads(supabase, user.id, search)
  const thread = threadId ? await getThreadDetail(supabase, user.id, threadId) : null

  if (thread) {
    await markThreadReadAction(thread.id)
  }

  return (
    <DashboardShell
      activePath="/dashboard/messages"
      title="Meddelanden"
      description="Kommunikation med hyresvärdar sker säkert här. Hyresvärden startar tråden när du har en aktiv ansökan."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <ThreadList threads={threads} basePath="/dashboard/messages" activeThreadId={threadId} search={search} />
        {thread ? (
          <ThreadDetailView thread={thread} currentUserId={user.id} basePath="/dashboard/messages" isLandlordSide={false} />
        ) : (
          <Card className="flex min-h-[520px] items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-xl font-semibold text-[#111827]">Välj en tråd</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#6b7280]">
                När en hyresvärd kontaktar dig om en ansökan visas tråden i listan. Du får också en notis och en
                e-postpåminnelse om du inte läst inom en timme.
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
