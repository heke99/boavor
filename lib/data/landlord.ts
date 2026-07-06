import { redirect } from 'next/navigation'
import { getAuthContext, type AuthContext } from '@/lib/auth/permissions'
import { isLandlordEntry } from '@/lib/auth/entry'

export type LandlordContext = AuthContext & {
  /** Companies the user belongs to (may be empty for private landlords). */
  companyIds: string[]
  primaryCompanyId: string | null
}

/**
 * Server-side guard for the landlord workspace. Seekers are redirected to the
 * regular dashboard; admins are allowed through for support purposes.
 */
export async function requireLandlordAccess(): Promise<LandlordContext> {
  const context = await getAuthContext({ loginRedirect: '/login?next=/landlord' })

  const isLandlord =
    isLandlordEntry({ role: context.profile.role, accountType: context.profile.accountType }) ||
    context.profile.companyIds.length > 0 ||
    ['admin', 'super_admin'].includes(context.profile.role)

  if (!isLandlord) {
    redirect('/dashboard')
  }

  return {
    ...context,
    companyIds: context.profile.companyIds,
    primaryCompanyId: context.profile.companyIds[0] ?? null,
  }
}

export type LandlordOverview = {
  activeListings: number
  totalListings: number
  applicationsToday: number
  totalApplications: number
  qualifiedApplicants: number
  averageDaysToRent: number | null
  unitCounts: Record<string, number>
  companyVerification: { name: string; status: string } | null
}

export async function getLandlordOverview(context: LandlordContext): Promise<LandlordOverview> {
  const { supabase, user, companyIds } = context

  const listingFilter = companyIds.length
    ? `created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `created_by.eq.${user.id}`

  const { data: listings } = await supabase
    .from('listings')
    .select('id, status, published_at, updated_at')
    .or(listingFilter)

  const listingIds = (listings ?? []).map((listing) => listing.id)

  const applicationsFilter = companyIds.length
    ? `landlord_user_id.eq.${user.id},landlord_company_id.in.(${companyIds.join(',')})`
    : `landlord_user_id.eq.${user.id}`

  const { data: applications } = await supabase
    .from('rental_applications')
    .select('id, status, created_at, listing_id')
    .or(applicationsFilter)

  const applicationIds = (applications ?? []).map((application) => application.id)
  const { data: policyResults } = applicationIds.length
    ? await supabase.from('application_policy_results').select('application_id, result').in('application_id', applicationIds)
    : { data: [] }

  // Units for vacancy overview.
  const propertyFilter = companyIds.length
    ? `owner_user_id.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `owner_user_id.eq.${user.id}`
  const { data: properties } = await supabase.from('properties').select('id').or(propertyFilter)
  const propertyIds = (properties ?? []).map((property) => property.id)
  const { data: units } = propertyIds.length
    ? await supabase.from('units').select('id, status').in('property_id', propertyIds)
    : { data: [] }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const rentedListings = (listings ?? []).filter((listing) => listing.status === 'rented' && listing.published_at)
  const daysToRent = rentedListings
    .map((listing) => {
      const published = new Date(listing.published_at as string).getTime()
      const updated = new Date(listing.updated_at ?? listing.published_at as string).getTime()
      return Math.max(0, Math.round((updated - published) / 86_400_000))
    })
    .filter((days) => Number.isFinite(days))

  const unitCounts: Record<string, number> = {}
  for (const unit of units ?? []) {
    unitCounts[unit.status] = (unitCounts[unit.status] ?? 0) + 1
  }

  let companyVerification: LandlordOverview['companyVerification'] = null
  if (context.primaryCompanyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('name, verification_status')
      .eq('id', context.primaryCompanyId)
      .maybeSingle()
    if (company) {
      companyVerification = { name: company.name, status: company.verification_status }
    }
  }

  void listingIds

  return {
    activeListings: (listings ?? []).filter((listing) => listing.status === 'published').length,
    totalListings: (listings ?? []).length,
    applicationsToday: (applications ?? []).filter((application) => new Date(application.created_at) >= startOfDay).length,
    totalApplications: (applications ?? []).length,
    qualifiedApplicants: (policyResults ?? []).filter((row) => row.result === 'eligible' || row.result === 'likely_eligible').length,
    averageDaysToRent: daysToRent.length ? Math.round(daysToRent.reduce((sum, days) => sum + days, 0) / daysToRent.length) : null,
    unitCounts,
    companyVerification,
  }
}
