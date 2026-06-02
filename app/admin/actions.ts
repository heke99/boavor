'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'
import type { AppRole, ListingStatus } from '@/lib/types'

const USER_ROLES: AppRole[] = ['seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin']
const LISTING_STATUSES: ListingStatus[] = ['draft', 'published', 'paused', 'rented', 'sold', 'archived']

async function logAdminAction(action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}) {
  const { supabase, user } = await requireAdminUser()
  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action,
    targetType,
    targetId,
    metadata,
  })
}

export async function updateCompanyVerificationAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const companyId = String(formData.get('companyId') ?? '')
  const verificationStatus = String(formData.get('verificationStatus') ?? 'pending')
  const verificationNote = String(formData.get('verificationNote') ?? '').trim() || null
  if (!companyId || !['pending', 'verified', 'rejected'].includes(verificationStatus)) return

  const { data: existing } = await supabase
    .from('companies')
    .select('id, verification_status')
    .eq('id', companyId)
    .maybeSingle<{ id: string; verification_status: string | null }>()

  if (!existing) return

  await supabase
    .from('companies')
    .update({
      verification_status: verificationStatus,
      verification_note: verificationNote,
      verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
      verified_by: verificationStatus === 'verified' ? user.id : null,
    })
    .eq('id', companyId)
  await logAdminAction('company_verification_updated', 'company', companyId, {
    previousStatus: existing.verification_status,
    verificationStatus,
    verificationNote,
  })
  revalidatePath('/admin')
  revalidatePath('/admin/companies')
}

export async function updateAdminListingStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const listingId = String(formData.get('listingId') ?? '')
  const status = String(formData.get('status') ?? 'paused') as ListingStatus
  if (!listingId || !LISTING_STATUSES.includes(status)) return

  const { data: listing } = await supabase
    .from('listings')
    .select('id, status')
    .eq('id', listingId)
    .maybeSingle<{ id: string; status: ListingStatus }>()
  if (!listing) return

  await supabase.from('listings').update({ status }).eq('id', listingId)
  await supabase.from('listing_activity_events').insert({
    listing_id: listingId,
    actor_user_id: user.id,
    event_type: 'admin_status_changed',
    message: `Admin ändrade status till ${status}`,
    payload: { previous_status: listing.status, status },
  })
  await logAdminAction('listing_status_updated', 'listing', listingId, { previousStatus: listing.status, status })
  revalidatePath('/admin/listings')
  revalidatePath('/admin')
}

export async function updateUserRoleAction(formData: FormData) {
  const { supabase, role: adminRole, user: adminUser } = await requireAdminUser()
  if (adminRole !== 'super_admin') return

  const userId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? 'seeker') as AppRole
  if (!userId || !USER_ROLES.includes(role)) return
  if (userId === adminUser.id && role !== 'super_admin') return

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: AppRole }>()
  if (!existing) return

  await supabase.from('profiles').update({ role }).eq('id', userId)
  await logAdminAction('user_role_updated', 'user', userId, { previousRole: existing.role, role })
  revalidatePath('/admin/users')
}

export async function createAdminInviteAction(formData: FormData) {
  const { supabase, user, role: adminRole } = await requireAdminUser()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const accountType = String(formData.get('accountType') ?? 'private')
  const role = String(formData.get('role') ?? 'seeker') as AppRole
  const note = String(formData.get('note') ?? '').trim() || null

  if (!email || !email.includes('@')) return
  if (!['private', 'company'].includes(accountType)) return
  if (!USER_ROLES.includes(role)) return
  if ((role === 'admin' || role === 'super_admin') && adminRole !== 'super_admin') return

  const { data } = await supabase
    .from('admin_user_invites')
    .insert({ email, account_type: accountType, role, note, invited_by: user.id })
    .select('id')
    .maybeSingle<{ id: string }>()

  await logAdminAction('user_invite_created', 'user_invite', data?.id ?? null, { email, accountType, role })
  revalidatePath('/admin/users')
}
