'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

const PLACEMENTS = ['home', 'rent', 'dashboard'] as const

function revalidateCampaignSurfaces() {
  revalidatePath('/admin/campaigns')
  revalidatePath('/')
  revalidatePath('/rent')
  revalidatePath('/dashboard')
}

export async function createCampaignAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const title = String(formData.get('title') ?? '').trim()
  const placement = String(formData.get('placement') ?? 'home')
  if (!title || !PLACEMENTS.includes(placement as (typeof PLACEMENTS)[number])) return

  const startsAt = String(formData.get('startsAt') ?? '').trim()
  const endsAt = String(formData.get('endsAt') ?? '').trim()
  const ctaUrl = String(formData.get('ctaUrl') ?? '').trim()
  // Only same-site or https destinations; campaigns must never become an open redirect.
  const safeCtaUrl = ctaUrl && (ctaUrl.startsWith('/') || ctaUrl.startsWith('https://')) ? ctaUrl : null

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      title,
      body: String(formData.get('body') ?? '').trim() || null,
      cta_label: String(formData.get('ctaLabel') ?? '').trim() || null,
      cta_url: safeCtaUrl,
      placement,
      is_active: formData.get('isActive') === 'on',
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to create campaign', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'campaign_created',
    targetType: 'campaign',
    targetId: data?.id ?? null,
    metadata: { title, placement },
  })

  revalidateCampaignSurfaces()
}

export async function toggleCampaignAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const campaignId = String(formData.get('campaignId') ?? '')
  const nextActive = String(formData.get('nextActive') ?? 'false') === 'true'
  if (!campaignId) return

  const { error } = await supabase.from('campaigns').update({ is_active: nextActive }).eq('id', campaignId)
  if (error) {
    console.error('Failed to toggle campaign', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: nextActive ? 'campaign_activated' : 'campaign_deactivated',
    targetType: 'campaign',
    targetId: campaignId,
  })

  revalidateCampaignSurfaces()
}

export async function deleteCampaignAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const campaignId = String(formData.get('campaignId') ?? '')
  if (!campaignId) return

  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
  if (error) {
    console.error('Failed to delete campaign', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'campaign_deleted',
    targetType: 'campaign',
    targetId: campaignId,
  })

  revalidateCampaignSurfaces()
}
