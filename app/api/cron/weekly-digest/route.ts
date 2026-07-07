import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import { sendTemplatedEmail } from '@/lib/email/send'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

/**
 * Weekly digest: summarizes each user's saved-search matches from the last
 * 7 days. Sent only to users with matches and the weekly_digest preference
 * enabled (default on; the preference check lives in sendTemplatedEmail).
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'weekly-digest', async (supabase) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const siteUrl = getSiteUrl()

    const { data: matches, error } = await supabase
      .from('saved_search_matches')
      .select('user_id, saved_search_id')
      .gte('created_at', since)

    if (error) throw new Error(error.message)

    const byUser = new Map<string, { matchCount: number; searchIds: Set<string> }>()
    for (const match of matches ?? []) {
      const entry = byUser.get(match.user_id) ?? { matchCount: 0, searchIds: new Set<string>() }
      entry.matchCount += 1
      entry.searchIds.add(match.saved_search_id)
      byUser.set(match.user_id, entry)
    }

    // Idempotency: a re-run (manual trigger, retried cron) must not send a
    // second digest. Skip users already sent a digest in the last 6 days.
    const dedupSince = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    const userIds = Array.from(byUser.keys())
    const { data: recentDigests } = userIds.length
      ? await supabase
          .from('email_events')
          .select('user_id')
          .eq('template_key', 'weekly_digest')
          .eq('status', 'sent')
          .gte('created_at', dedupSince)
          .in('user_id', userIds)
      : { data: [] }
    const alreadySent = new Set((recentDigests ?? []).map((row) => row.user_id))

    let digestsSent = 0
    let skippedAlreadySent = 0

    for (const [userId, summary] of byUser) {
      if (alreadySent.has(userId)) {
        skippedAlreadySent += 1
        continue
      }

      const { data: userInfo } = await supabase.auth.admin.getUserById(userId)
      const email = userInfo?.user?.email
      if (!email) continue

      const result = await sendTemplatedEmail(supabase, {
        userId,
        to: email,
        templateKey: 'weekly_digest',
        data: {
          matchCount: summary.matchCount,
          searchCount: summary.searchIds.size,
          listUrl: `${siteUrl}/dashboard/saved-searches`,
        },
      })

      if (result.status === 'sent') digestsSent += 1
    }

    return { usersWithMatches: byUser.size, digestsSent, skippedAlreadySent }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
