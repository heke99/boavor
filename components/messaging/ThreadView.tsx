import Link from 'next/link'
import { CalendarClock, Lock, LockOpen, Paperclip, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sendMessageAction, setThreadDeadlineAction, setThreadLockAction } from '@/app/dashboard/messages/actions'
import type { ThreadDetail, ThreadListItem } from '@/lib/data/messages'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function ThreadList({
  threads,
  basePath,
  activeThreadId,
  search,
}: {
  threads: ThreadListItem[]
  basePath: string
  activeThreadId: string | null
  search?: string
}) {
  return (
    <Card className="p-4">
      <form className="mb-3 flex gap-2">
        <Input name="q" defaultValue={search ?? ''} placeholder="Sök i dina trådar…" className="h-10 flex-1 rounded-2xl text-sm" />
        <Button type="submit" variant="secondary" className="h-10 px-3 text-xs">Sök</Button>
      </form>
      {threads.length === 0 ? (
        <p className="rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga meddelandetrådar ännu.</p>
      ) : (
        <ul className="space-y-1">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`${basePath}?thread=${thread.id}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                className={`block rounded-2xl px-4 py-3 transition ${
                  activeThreadId === thread.id ? 'bg-[#eef2ff]' : 'hover:bg-[#f7f8fc]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#111827]">{thread.subject}</span>
                  {thread.unreadCount > 0 ? (
                    <span className="rounded-full bg-[#5b3df5] px-2 py-0.5 text-xs font-bold text-white">{thread.unreadCount}</span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#6b7280]">
                  {formatDateTime(thread.lastMessageAt)}
                  {thread.lockedAt ? <Lock size={12} /> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function ThreadDetailView({
  thread,
  currentUserId,
  basePath,
  isLandlordSide,
}: {
  thread: ThreadDetail
  currentUserId: string
  basePath: string
  isLandlordSide: boolean
}) {
  const deadlinePassed = thread.responseDeadlineAt ? new Date(thread.responseDeadlineAt).getTime() < new Date().getTime() : false
  const isLocked = Boolean(thread.lockedAt)
  const canReply = !isLocked || thread.myRole === 'landlord' || thread.myRole === 'support'

  return (
    <Card className="flex min-h-[520px] flex-col p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f6] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">{thread.subject}</h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#6b7280]">
            {thread.responseDeadlineAt ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${deadlinePassed ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                <CalendarClock size={12} />
                Svar senast {formatDateTime(thread.responseDeadlineAt)}
              </span>
            ) : null}
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-3 py-1 font-semibold text-[#6b7280]">
                <Lock size={12} /> Tråden är låst för svar
              </span>
            ) : null}
          </div>
        </div>

        {isLandlordSide && (thread.myRole === 'landlord' || thread.myRole === 'support') ? (
          <div className="flex flex-wrap gap-2">
            <form action={setThreadDeadlineAction} className="flex gap-2">
              <input type="hidden" name="threadId" value={thread.id} />
              <Input name="deadline" type="datetime-local" className="h-9 rounded-xl text-xs" defaultValue={thread.responseDeadlineAt ? thread.responseDeadlineAt.slice(0, 16) : ''} />
              <Button type="submit" variant="ghost" className="h-9 border border-black/10 px-3 text-xs">Sätt frist</Button>
            </form>
            <form action={setThreadLockAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <input type="hidden" name="lock" value={isLocked ? 'false' : 'true'} />
              <Button type="submit" variant="ghost" className="h-9 border border-black/10 px-3 text-xs">
                {isLocked ? <LockOpen size={13} className="mr-1" /> : <Lock size={13} className="mr-1" />}
                {isLocked ? 'Lås upp' : 'Lås tråd'}
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-5">
        {thread.messages.map((message) => {
          const isMine = message.senderUserId === currentUserId
          return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMine ? 'bg-[#5b3df5] text-white' : 'bg-[#f3f4f6] text-[#111827]'}`}>
                <div className={`text-xs font-semibold ${isMine ? 'text-white/80' : 'text-[#6b7280]'}`}>
                  {message.senderName} · {formatDateTime(message.createdAt)}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                {message.attachments.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold underline underline-offset-2 ${isMine ? 'bg-white/10 text-white' : 'bg-white text-[#5b3df5]'}`}
                      >
                        <Paperclip size={12} />
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
        {thread.messages.length === 0 ? (
          <p className="text-center text-sm text-[#6b7280]">Inga meddelanden ännu.</p>
        ) : null}
      </div>

      {canReply ? (
        <form action={sendMessageAction} className="border-t border-[#eef0f6] pt-4" encType="multipart/form-data">
          <input type="hidden" name="threadId" value={thread.id} />
          <input type="hidden" name="backTo" value={basePath} />
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Skriv ett meddelande…"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#6b7280]">
              <Paperclip size={14} />
              <input type="file" name="attachment" accept=".pdf,image/jpeg,image/png" className="text-xs" />
              <span>(jpg, png, pdf — max 30 MB)</span>
            </label>
            <Button type="submit" className="h-10">
              <Send size={15} className="mr-2" />
              Skicka
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-[#eef0f6] pt-4 text-center text-sm font-semibold text-[#6b7280]">
          Tråden är låst — hyresvärden kan öppna den igen vid behov.
        </div>
      )}
    </Card>
  )
}
