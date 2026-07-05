import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import type { AppRole } from '@/lib/types'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

export type AuthProfile = {
  id: string
  role: AppRole
  accountType: string
  companyIds: string[]
}

export type AuthContext = {
  supabase: SupabaseServerClient
  user: User
  profile: AuthProfile
}

export type ListingOwnership = {
  id: string
  created_by: string | null
  company_id: string | null
  status?: string | null
}

const ADMIN_ROLES: AppRole[] = ['admin', 'super_admin']
const LISTING_MANAGER_ROLES: AppRole[] = ['seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin']

export function isAdminRole(role: AppRole | null | undefined) {
  return Boolean(role && ADMIN_ROLES.includes(role))
}

export function isSuperAdminRole(role: AppRole | null | undefined) {
  return role === 'super_admin'
}

export function canCreateListing(role: AppRole | null | undefined) {
  return Boolean(role && LISTING_MANAGER_ROLES.includes(role))
}

export function canManageListing(profile: Pick<AuthProfile, 'id' | 'role' | 'companyIds'>, listing: ListingOwnership | null | undefined) {
  if (!listing) return false
  if (isAdminRole(profile.role)) return true
  if (listing.created_by === profile.id) return true
  if (listing.company_id && profile.companyIds.includes(listing.company_id)) return true
  return false
}

export function canManageCompany(profile: Pick<AuthProfile, 'id' | 'role' | 'companyIds'>, companyId: string | null | undefined) {
  if (!companyId) return false
  if (isAdminRole(profile.role)) return true
  return profile.companyIds.includes(companyId)
}

export function canManageApplication(
  profile: Pick<AuthProfile, 'id' | 'role' | 'companyIds'>,
  application: { landlord_user_id: string | null; landlord_company_id: string | null } | null | undefined,
) {
  if (!application) return false
  if (isAdminRole(profile.role)) return true
  if (application.landlord_user_id === profile.id) return true
  if (application.landlord_company_id && profile.companyIds.includes(application.landlord_company_id)) return true
  return false
}

export function canManageInquiry(
  profile: Pick<AuthProfile, 'id' | 'role' | 'companyIds'>,
  inquiry: { landlord_user_id: string | null; landlord_company_id: string | null; listing?: ListingOwnership | null } | null | undefined,
) {
  if (!inquiry) return false
  if (isAdminRole(profile.role)) return true
  if (inquiry.landlord_user_id === profile.id) return true
  if (inquiry.landlord_company_id && profile.companyIds.includes(inquiry.landlord_company_id)) return true
  if (inquiry.listing && canManageListing(profile, inquiry.listing)) return true
  return false
}

export async function getUserCompanyIds(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to resolve company memberships', error)
    return [] as string[]
  }

  return ((data ?? []) as Array<{ company_id: string | null }>).map((row) => row.company_id).filter(Boolean) as string[]
}

export async function getAuthContext(options: { loginRedirect?: string } = {}): Promise<AuthContext> {
  const loginRedirect = options.loginRedirect ?? '/login'
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect(loginRedirect)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) redirect(loginRedirect)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, account_type')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: AppRole; account_type: string | null }>()

  if (error) {
    console.error('Failed to resolve auth profile', error)
    redirect(loginRedirect)
  }

  if (!profile) redirect(loginRedirect)

  const companyIds = await getUserCompanyIds(supabase, user.id)

  return {
    supabase,
    user,
    profile: {
      id: profile.id,
      role: profile.role,
      accountType: profile.account_type ?? 'private',
      companyIds,
    },
  }
}

export async function requireDashboardAccess() {
  return getAuthContext({ loginRedirect: '/login?next=/dashboard' })
}

export async function requireAdminAccess() {
  const context = await getAuthContext({ loginRedirect: '/login?next=/admin' })
  if (!isAdminRole(context.profile.role)) redirect('/dashboard')
  return context
}

export async function requireSuperAdminAccess() {
  const context = await requireAdminAccess()
  if (!isSuperAdminRole(context.profile.role)) redirect('/admin')
  return context
}

export async function getManagedListingOwnership(supabase: SupabaseServerClient, listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, created_by, company_id, status')
    .eq('id', listingId)
    .maybeSingle<ListingOwnership>()

  if (error) {
    console.error('Failed to resolve listing ownership', error)
    return null
  }

  return data
}

export async function assertCanManageListing(context: AuthContext, listingId: string) {
  const listing = await getManagedListingOwnership(context.supabase, listingId)
  if (!canManageListing(context.profile, listing)) return null
  return listing
}

export async function logAdminAudit(
  supabase: SupabaseServerClient,
  params: { adminUserId: string; action: string; targetType: string; targetId?: string | null; metadata?: Json },
) {
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? {},
  })
}
