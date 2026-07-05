import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { createSupabaseServerClient as CreateClient } from '@/lib/supabase/server'
import {
  checkApplicationLimit,
  isActiveApplicationStatus,
  resolveApplicationLimit,
  type ApplicationLimitCheck,
} from '@/lib/queue/limits'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof CreateClient>>>

export type QueueLedgerEntry = {
  id: string
  eventType: string
  pointsDelta: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

export async function getQueueLedger(limit = 20): Promise<QueueLedgerEntry[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('queue_point_ledger')
    .select('id, event_type, points_delta, balance_after, note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch queue ledger', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    pointsDelta: row.points_delta,
    balanceAfter: row.balance_after,
    note: row.note,
    createdAt: row.created_at,
  }))
}

/** Server-side application limit check for a user. */
export async function getApplicationLimitCheck(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ApplicationLimitCheck> {
  const [{ data: subscriptions }, { data: applications }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('status, subscription_plans(max_active_applications)')
      .eq('user_id', userId),
    supabase.from('rental_applications').select('status').eq('user_id', userId),
  ])

  const limit = resolveApplicationLimit(
    (subscriptions ?? []).map((row) => {
      const plan = row.subscription_plans as { max_active_applications: number | null } | null
      return {
        status: row.status,
        maxActiveApplications: plan?.max_active_applications ?? null,
      }
    }),
  )

  const activeCount = (applications ?? []).filter((row) => isActiveApplicationStatus(row.status)).length

  return checkApplicationLimit(activeCount, limit)
}

/** Queue points of accepted, linked co-applicants (for household rules). */
export async function getHouseholdCoApplicantPoints(supabase: SupabaseServerClient): Promise<number[]> {
  const { data, error } = await supabase.rpc('household_queue_points')
  if (error) {
    console.error('Failed to fetch household queue points', error)
    return []
  }
  return (data ?? []).map((row) => row.points)
}
