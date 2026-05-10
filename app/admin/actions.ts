'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import type { AppRole, ListingStatus } from '@/lib/types'

async function logAdminAction(action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}) {
  const { supabase, user } = await requireAdminUser()
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  })
}

export async function updateCompanyVerificationAction(formData: FormData) {
  const { supabase } = await requireAdminUser()
  const companyId = String(formData.get('companyId') ?? '')
  const verificationStatus = String(formData.get('verificationStatus') ?? 'pending')
  if (!companyId || !['pending', 'verified', 'rejected'].includes(verificationStatus)) return

  await supabase.from('companies').update({ verification_status: verificationStatus }).eq('id', companyId)
  await logAdminAction('company_verification_updated', 'company', companyId, { verificationStatus })
  revalidatePath('/admin')
  revalidatePath('/admin/companies')
}

export async function updateAdminListingStatusAction(formData: FormData) {
  const { supabase } = await requireAdminUser()
  const listingId = String(formData.get('listingId') ?? '')
  const status = String(formData.get('status') ?? 'paused') as ListingStatus
  if (!listingId || !['draft', 'published', 'paused', 'rented', 'sold', 'archived'].includes(status)) return

  await supabase.from('listings').update({ status }).eq('id', listingId)
  await supabase.from('listing_activity_events').insert({
    listing_id: listingId,
    event_type: 'admin_status_changed',
    message: `Admin ändrade status till ${status}`,
    payload: { status },
  })
  await logAdminAction('listing_status_updated', 'listing', listingId, { status })
  revalidatePath('/admin/listings')
  revalidatePath('/admin')
}

export async function updateUserRoleAction(formData: FormData) {
  const { supabase, role: adminRole } = await requireAdminUser()
  if (adminRole !== 'super_admin') return

  const userId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? 'seeker') as AppRole
  if (!userId || !['seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(role)) return

  await supabase.from('profiles').update({ role }).eq('id', userId)
  await logAdminAction('user_role_updated', 'user', userId, { role })
  revalidatePath('/admin/users')
}

export async function createAdminInviteAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const accountType = String(formData.get('accountType') ?? 'private')
  const role = String(formData.get('role') ?? 'seeker') as AppRole
  const note = String(formData.get('note') ?? '').trim() || null

  if (!email || !email.includes('@')) return
  if (!['private', 'company'].includes(accountType)) return
  if (!['seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(role)) return

  const { data } = await supabase
    .from('admin_user_invites')
    .insert({ email, account_type: accountType, role, note, invited_by: user.id })
    .select('id')
    .maybeSingle<{ id: string }>()

  await logAdminAction('user_invite_created', 'user_invite', data?.id ?? null, { email, accountType, role })
  revalidatePath('/admin/users')
}
