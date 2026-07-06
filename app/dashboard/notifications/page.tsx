import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthContext } from '@/lib/auth/permissions'
import { markAllNotificationsReadAction, markNotificationReadAction } from './actions'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Allmänt',
  saved_searches: 'Bevakningar',
  applications: 'Ansökningar',
  messages: 'Meddelanden',
  queue: 'Kö',
  byta: 'Byten',
}

export default async function NotificationsPage() {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/notifications' })

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, category, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = (notifications ?? []).filter((notification) => !notification.read_at).length

  return (
    <DashboardShell
      activePath="/dashboard/notifications"
      title="Notiser"
      description="Alla dina notiser från ansökningar, meddelanden, bevakningar och köer."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#4338ca]">
          <Bell size={15} />
          {unreadCount} olästa
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary">
              <CheckCheck size={15} className="mr-2" />
              Markera alla som lästa
            </Button>
          </form>
        ) : null}
      </div>

      {(notifications ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga notiser ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Här samlas statusuppdateringar, nya meddelanden och bevakningsträffar.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(notifications ?? []).map((notification) => (
            <Card key={notification.id} className={`p-4 ${notification.read_at ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!notification.read_at ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#5b3df5]" /> : null}
                    <span className="font-semibold text-[#111827]">{notification.title}</span>
                    <span className="rounded-full bg-[#f7f8fc] px-2 py-0.5 text-xs font-semibold text-[#6b7280]">
                      {CATEGORY_LABELS[notification.category] ?? notification.category}
                    </span>
                  </div>
                  {notification.body ? <p className="mt-1 text-sm text-[#6b7280]">{notification.body}</p> : null}
                  <div className="mt-1 text-xs text-[#9ca3af]">
                    {new Date(notification.created_at).toLocaleString('sv-SE')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notification.link ? (
                    <Link href={notification.link} className="text-sm font-semibold text-[#5b3df5]">
                      Öppna
                    </Link>
                  ) : null}
                  {!notification.read_at ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button type="submit" variant="ghost" className="h-8 border border-black/10 px-3 text-xs">
                        Markera läst
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
