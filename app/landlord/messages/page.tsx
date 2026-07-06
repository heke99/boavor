import { LandlordShell } from '@/components/landlord/LandlordShell'
import { ThreadDetailView, ThreadList } from '@/components/messaging/ThreadView'
import { Card } from '@/components/ui/Card'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { getThreadDetail, getThreads } from '@/lib/data/messages'
import { markThreadReadAction } from '@/app/dashboard/messages/actions'
import { LANDLORD_MESSAGE_TEMPLATES } from '@/lib/landlord/message-templates'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LandlordMessagesPage({ searchParams }: Props) {
  const params = await searchParams
  const context = await requireLandlordAccess()
  const { supabase, user } = context

  const search = typeof params.q === 'string' ? params.q : undefined
  const threadId = typeof params.thread === 'string' ? params.thread : null

  const threads = await getThreads(supabase, user.id, search)
  const thread = threadId ? await getThreadDetail(supabase, user.id, threadId) : null

  if (thread) {
    await markThreadReadAction(thread.id)
  }

  return (
    <LandlordShell
      activePath="/landlord/messages"
      title="Meddelanden"
      description="Trådar med sökande per ansökan. Starta nya trådar från urvalsvyn på respektive annons."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <ThreadList threads={threads} basePath="/landlord/messages" activeThreadId={threadId} search={search} />
        {thread ? (
          <ThreadDetailView thread={thread} currentUserId={user.id} basePath="/landlord/messages" isLandlordSide />
        ) : (
          <Card className="flex min-h-[520px] items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-xl font-semibold text-[#111827]">Välj en tråd</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#6b7280]">
                Starta en tråd från en ansökan under Urval och ansökningar på respektive annons.
              </p>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827]">Meddelandemallar</h2>
        <p className="mt-1 text-sm text-[#6b7280]">Kopiera en mall och anpassa i meddelandefältet.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LANDLORD_MESSAGE_TEMPLATES.map((template) => (
            <details key={template.id} className="rounded-2xl border border-[#e8ebf3] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1d4ed8]">{template.label}</summary>
              <pre className="mt-2 select-all whitespace-pre-wrap rounded-xl bg-[#f7f8fc] p-3 font-sans text-xs leading-6 text-[#374151]">{template.body}</pre>
            </details>
          ))}
        </div>
      </Card>
    </LandlordShell>
  )
}
