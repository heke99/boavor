import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Placement = 'home' | 'rent' | 'dashboard'

/**
 * Renders the active admin-managed campaign for a placement, if any.
 * Reads through the anon client; RLS only exposes active campaigns inside
 * their time window. Fails soft — a broken query never breaks the page.
 */
export async function CampaignBanner({ placement }: { placement: Placement }) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  // The active/time-window filters are also enforced by RLS for anonymous
  // visitors; they are repeated here so admins (who can read everything)
  // see the same banner as the public.
  const nowIso = new Date().toISOString()
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, body, cta_label, cta_url')
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!campaign) return null

  return (
    <div className="rounded-[28px] border border-[#e0e7ff] bg-[linear-gradient(120deg,#eef2ff,#ffffff_60%)] p-5 shadow-[0_14px_44px_rgba(36,59,143,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#5b3df5]/10 text-[#5b3df5]">
            <Megaphone size={18} />
          </div>
          <div>
            <div className="font-semibold text-[#111827]">{campaign.title}</div>
            {campaign.body ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5b6475]">{campaign.body}</p> : null}
          </div>
        </div>
        {campaign.cta_url ? (
          <Link
            href={campaign.cta_url}
            className="inline-flex items-center rounded-2xl bg-[#5b3df5] px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#4c31d8]"
          >
            {campaign.cta_label ?? 'Läs mer'}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
