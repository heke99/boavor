import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseStorageUri } from '@/lib/storage'
import type {
  AppRole,
  CompanyMembershipItem,
  CompanyType,
  DashboardProfileItem,
  LegalForm,
  QueueMembershipItem,
  SubscriptionStatus,
} from '@/lib/types'

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: AppRole
  account_type?: DashboardProfileItem['accountType'] | null
  identity_verified_at?: string | null
  preferred_listing_intent?: DashboardProfileItem['preferredListingIntent'] | null
  terms_accepted_at?: string | null
  privacy_accepted_at?: string | null
  personal_identity_consent_at?: string | null
  marketing_consent?: boolean | null
  city: string | null
  household_size: number | null
  has_pets: boolean
  employment_status: string | null
  employer_name: string | null
  monthly_income: number | null
  desired_move_in: string | null
  desired_locations: string[] | null
}

type CoApplicantRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  relationship: string | null
  created_at: string
}

type ProfileDocumentRow = {
  id: string
  file_name: string
  file_url: string
  document_type: string
  document_status?: 'active' | 'expired' | 'replaced' | null
  document_expires_at?: string | null
  is_default_for_applications?: boolean | null
  created_at: string
}

type QueueMembershipRow = {
  id: string
  membership_status: QueueMembershipItem['status']
  joined_queue_at: string
  current_points: number
  months_in_queue: number
  last_point_awarded_at: string | null
  next_billing_at: string | null
}

type SubscriptionRow = {
  status: SubscriptionStatus
}

type CompanyMembershipRow = {
  role: AppRole
  // company_members -> companies is many-to-one, so PostgREST embeds a single object.
  companies: {
    id: string
    name: string
    slug: string
    company_type: CompanyType | null
    legal_form: LegalForm | null
  } | null
}

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString)
  date.setMonth(date.getMonth() + months)
  return date
}

function fullMonthsBetween(start: string, end: Date) {
  const startDate = new Date(start)
  let months = (end.getFullYear() - startDate.getFullYear()) * 12 + (end.getMonth() - startDate.getMonth())
  const candidate = addMonths(start, months)
  if (candidate > end) months -= 1
  return Math.max(0, months)
}

async function ensureProfileExists(userId: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return

  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!data) {
    await supabase.from('profiles').insert({ id: userId })
  }
}

async function syncQueueMembership(userId: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return

  const { data: membership } = await supabase
    .from('queue_memberships')
    .select('id, membership_status, joined_queue_at, current_points, months_in_queue, last_point_awarded_at, next_billing_at')
    .eq('user_id', userId)
    .maybeSingle<QueueMembershipRow>()

  if (!membership || membership.membership_status !== 'active') return

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('plan_code', 'queue_monthly')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>()

  if (!subscription || subscription.status !== 'active') return

  const now = new Date()
  const monthsEarned = fullMonthsBetween(membership.joined_queue_at, now)
  if (monthsEarned <= membership.current_points) return

  const delta = monthsEarned - membership.current_points
  const nextBillingAt = addMonths(membership.joined_queue_at, monthsEarned + 1).toISOString()

  await supabase
    .from('queue_memberships')
    .update({
      current_points: monthsEarned,
      months_in_queue: monthsEarned,
      last_point_awarded_at: now.toISOString(),
      next_billing_at: nextBillingAt,
    })
    .eq('id', membership.id)

  await supabase.from('queue_point_ledger').insert({
    user_id: userId,
    membership_id: membership.id,
    event_type: 'monthly_accrual',
    points_delta: delta,
    balance_after: monthsEarned,
    note: `${delta} månad(er) köpoäng uppdaterade automatiskt.`,
  })
}

export async function getDashboardProfile() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { isSignedIn: false as const, profile: null }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { isSignedIn: false as const, profile: null }
  }

  await ensureProfileExists(user.id)
  await syncQueueMembership(user.id)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, phone, role, account_type, identity_verified_at, preferred_listing_intent, terms_accepted_at, privacy_accepted_at, personal_identity_consent_at, marketing_consent, city, household_size, has_pets, employment_status, employer_name, monthly_income, desired_move_in, desired_locations',
    )
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  const { data: coApplicants } = await supabase
    .from('co_applicants')
    .select('id, full_name, email, phone, relationship, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: documents } = await supabase
    .from('profile_documents')
    .select('id, file_name, file_url, document_type, document_status, document_expires_at, is_default_for_applications, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: membership } = await supabase
    .from('queue_memberships')
    .select('id, membership_status, joined_queue_at, current_points, months_in_queue, last_point_awarded_at, next_billing_at')
    .eq('user_id', user.id)
    .maybeSingle<QueueMembershipRow>()

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('plan_code', 'queue_monthly')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>()

  const { data: companyMemberships } = await supabase
    .from('company_members')
    .select('role, companies(id, name, slug, company_type, legal_form)')
    .eq('user_id', user.id)

  const profile: DashboardProfileItem = {
    id: user.id,
    email: user.email,
    firstName: profileRow?.first_name ?? '',
    lastName: profileRow?.last_name ?? '',
    phone: profileRow?.phone ?? '',
    role: profileRow?.role ?? 'seeker',
    accountType: profileRow?.account_type ?? 'private',
    identityVerifiedAt: profileRow?.identity_verified_at ?? null,
    preferredListingIntent: profileRow?.preferred_listing_intent ?? 'both',
    termsAcceptedAt: profileRow?.terms_accepted_at ?? null,
    privacyAcceptedAt: profileRow?.privacy_accepted_at ?? null,
    personalIdentityConsentAt: profileRow?.personal_identity_consent_at ?? null,
    marketingConsent: profileRow?.marketing_consent ?? false,
    city: profileRow?.city ?? '',
    householdSize: profileRow?.household_size ?? null,
    hasPets: profileRow?.has_pets ?? false,
    employmentStatus: profileRow?.employment_status ?? 'employed',
    employerName: profileRow?.employer_name ?? '',
    monthlyIncome: profileRow?.monthly_income ?? null,
    desiredMoveIn: profileRow?.desired_move_in ?? null,
    desiredLocations: profileRow?.desired_locations ?? [],
    coApplicants: ((coApplicants ?? []) as CoApplicantRow[]).map((item) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      phone: item.phone,
      relationship: item.relationship,
      createdAt: item.created_at,
    })),
    documents: ((documents ?? []) as ProfileDocumentRow[]).map((item) => ({
      id: item.id,
      fileName: item.file_name,
      fileUrl: parseStorageUri(item.file_url) ? `/dashboard/documents/${item.id}/view` : item.file_url,
      documentType: item.document_type,
      documentStatus: item.document_status ?? 'active',
      documentExpiresAt: item.document_expires_at ?? null,
      isDefaultForApplications: item.is_default_for_applications ?? false,
      createdAt: item.created_at,
    })),
    queueMembership: membership
      ? {
          id: membership.id,
          status: membership.membership_status,
          joinedQueueAt: membership.joined_queue_at,
          currentPoints: membership.current_points,
          monthsInQueue: membership.months_in_queue,
          nextBillingAt: membership.next_billing_at,
          subscriptionStatus: subscription?.status ?? null,
        }
      : null,
    companies: ((companyMemberships ?? []) as unknown as CompanyMembershipRow[])
      .map((item) => {
        const company = item.companies
        if (!company) return null

        return {
          companyId: company.id,
          name: company.name,
          slug: company.slug,
          companyType: company.company_type ?? 'landlord_company',
          legalForm: company.legal_form ?? 'ab',
          memberRole: item.role,
        }
      })
      .filter((item): item is CompanyMembershipItem => item !== null),
  }

  return { isSignedIn: true as const, profile }
}