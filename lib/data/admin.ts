import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  AppRole,
  InquiryStatus,
  ListingSegment,
  ListingStatus,
  ListingType,
  RentalApplicationStatus,
} from '@/lib/types'

export type AdminUserRow = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: AppRole
  accountType: 'private' | 'company' | string
  city: string | null
  createdAt: string | null
}

export type AdminCompanyRow = {
  id: string
  name: string
  slug: string
  organizationNumber: string | null
  email: string | null
  phone: string | null
  city: string | null
  legalForm: string | null
  businessPurpose: string | null
  verificationStatus: 'pending' | 'verified' | 'rejected' | string
  createdAt: string
  listingsCount: number
  membersCount: number
}

export type AdminListingRow = {
  id: string
  slug: string
  title: string
  city: string
  listingType: ListingType
  listingSegment: ListingSegment
  status: ListingStatus
  price: number
  createdAt: string
  ownerType: 'company' | 'private'
  companyName: string | null
  applicationsCount: number
  inquiriesCount: number
}

export type AdminApplicationRow = {
  id: string
  status: RentalApplicationStatus
  createdAt: string
  listingId: string | null
  listingTitle: string
  listingCity: string
  applicantName: string
  applicantEmail: string
  queuePoints: number
  landlordCompanyId: string | null
  landlordCompanyName: string | null
}

export type AdminInquiryRow = {
  id: string
  status: InquiryStatus
  inquiryType: string
  createdAt: string
  listingId: string | null
  listingTitle: string
  listingCity: string
  listingSegment: ListingSegment
  requesterName: string
  requesterEmail: string
  requesterPhone: string | null
  requesterCompanyName: string | null
  landlordCompanyId: string | null
  landlordCompanyName: string | null
}

export type AdminOverviewData = {
  stats: {
    users: number
    privateUsers: number
    companyUsers: number
    companies: number
    pendingCompanies: number
    listings: number
    publishedListings: number
    applications: number
    inquiries: number
  }
  latestUsers: AdminUserRow[]
  latestListings: AdminListingRow[]
  pendingCompanies: AdminCompanyRow[]
}

async function getAdminClient() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/login?next=/admin')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: AppRole }>()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  return { supabase, user, role: profile.role }
}

function like(value?: string) {
  return value ? `%${value}%` : undefined
}

export async function requireAdminUser() {
  return getAdminClient()
}

export async function getAdminUsers(params: { q?: string; accountType?: string; role?: string } = {}) {
  const { supabase } = await getAdminClient()
  const { data, error } = await supabase.rpc('admin_user_overview')

  if (error) {
    console.error('Failed to fetch admin users', error)
    return [] as AdminUserRow[]
  }

  let rows = ((data ?? []) as Array<{
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
    role: AppRole
    account_type: string
    city: string | null
    created_at: string | null
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    role: row.role,
    accountType: row.account_type,
    city: row.city,
    createdAt: row.created_at,
  }))

  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((row) =>
      [row.email, row.firstName, row.lastName, row.phone, row.city].some((value) => value?.toLowerCase().includes(q)),
    )
  }
  if (params.accountType && params.accountType !== 'all') rows = rows.filter((row) => row.accountType === params.accountType)
  if (params.role && params.role !== 'all') rows = rows.filter((row) => row.role === params.role)

  return rows
}

export async function getAdminCompanies(params: { q?: string; verificationStatus?: string } = {}): Promise<AdminCompanyRow[]> {
  const { supabase } = await getAdminClient()

  let query = supabase
    .from('companies')
    .select('id, name, slug, organization_number, org_number, email, phone, city, legal_form, business_purpose, verification_status, created_at')
    .order('created_at', { ascending: false })

  if (params.q) query = query.or(`name.ilike.${like(params.q)},organization_number.ilike.${like(params.q)},org_number.ilike.${like(params.q)},email.ilike.${like(params.q)}`)
  if (params.verificationStatus && params.verificationStatus !== 'all') query = query.eq('verification_status', params.verificationStatus)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch admin companies', error)
    return [] as AdminCompanyRow[]
  }

  const companyIds = ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  const [{ data: listings }, { data: members }] = companyIds.length
    ? await Promise.all([
        supabase.from('listings').select('company_id').in('company_id', companyIds),
        supabase.from('company_members').select('company_id').in('company_id', companyIds),
      ])
    : [{ data: [] }, { data: [] }]

  const listingCounts = new Map<string, number>()
  for (const row of (listings ?? []) as Array<{ company_id: string }>) listingCounts.set(row.company_id, (listingCounts.get(row.company_id) ?? 0) + 1)
  const memberCounts = new Map<string, number>()
  for (const row of (members ?? []) as Array<{ company_id: string }>) memberCounts.set(row.company_id, (memberCounts.get(row.company_id) ?? 0) + 1)

  return ((data ?? []) as Array<{
    id: string
    name: string
    slug: string
    organization_number: string | null
    org_number?: string | null
    email: string | null
    phone: string | null
    city: string | null
    legal_form: string | null
    business_purpose: string | null
    verification_status: string
    created_at: string
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    organizationNumber: row.organization_number ?? row.org_number ?? null,
    email: row.email,
    phone: row.phone,
    city: row.city,
    legalForm: row.legal_form,
    businessPurpose: row.business_purpose,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    listingsCount: listingCounts.get(row.id) ?? 0,
    membersCount: memberCounts.get(row.id) ?? 0,
  }))
}

export async function getAdminListings(params: { q?: string; segment?: string; status?: string; ownerType?: string } = {}): Promise<AdminListingRow[]> {
  const { supabase } = await getAdminClient()

  let query = supabase
    .from('listings')
    .select('id, slug, title, city, listing_type, listing_segment, status, price, created_at, created_by, company_id, companies(name)')
    .order('created_at', { ascending: false })

  if (params.q) query = query.or(`title.ilike.${like(params.q)},city.ilike.${like(params.q)}`)
  if (params.segment && params.segment !== 'all') query = query.eq('listing_segment', params.segment)
  if (params.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params.ownerType === 'company') query = query.not('company_id', 'is', null)
  if (params.ownerType === 'private') query = query.is('company_id', null)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch admin listings', error)
    return [] as AdminListingRow[]
  }

  const listingIds = ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  const [{ data: apps }, { data: inquiries }] = listingIds.length
    ? await Promise.all([
        supabase.from('rental_applications').select('listing_id').in('listing_id', listingIds),
        supabase.from('listing_inquiries').select('listing_id').in('listing_id', listingIds),
      ])
    : [{ data: [] }, { data: [] }]

  const appCounts = new Map<string, number>()
  for (const row of (apps ?? []) as Array<{ listing_id: string }>) appCounts.set(row.listing_id, (appCounts.get(row.listing_id) ?? 0) + 1)
  const inquiryCounts = new Map<string, number>()
  for (const row of (inquiries ?? []) as Array<{ listing_id: string }>) inquiryCounts.set(row.listing_id, (inquiryCounts.get(row.listing_id) ?? 0) + 1)

  return ((data ?? []) as Array<{
    id: string
    slug: string
    title: string
    city: string
    listing_type: ListingType
    listing_segment: ListingSegment | null
    status: ListingStatus
    price: number
    created_at: string
    company_id: string | null
    companies: Array<{ name: string }> | { name: string } | null
  }>).map((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      city: row.city,
      listingType: row.listing_type,
      listingSegment: row.listing_segment ?? 'residential',
      status: row.status,
      price: row.price,
      createdAt: row.created_at,
      ownerType: row.company_id ? ('company' as const) : ('private' as const),
      companyName: company?.name ?? null,
      applicationsCount: appCounts.get(row.id) ?? 0,
      inquiriesCount: inquiryCounts.get(row.id) ?? 0,
    }
  })
}

export async function getAdminApplications(params: { q?: string; status?: string } = {}): Promise<AdminApplicationRow[]> {
  const { supabase } = await getAdminClient()
  let query = supabase
    .from('rental_applications')
    .select('id, status, created_at, listing_id, listing_title, listing_city, applicant_full_name, applicant_email, queue_points_snapshot, landlord_company_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.status && params.status !== 'all') query = query.eq('status', params.status)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch admin applications', error)
    return [] as AdminApplicationRow[]
  }

  let rows = (data ?? []) as Array<{
    id: string
    status: RentalApplicationStatus
    created_at: string
    listing_id: string | null
    listing_title: string
    listing_city: string
    applicant_full_name: string
    applicant_email: string
    queue_points_snapshot: number
    landlord_company_id: string | null
  }>

  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((row) => [row.listing_title, row.listing_city, row.applicant_full_name, row.applicant_email].some((value) => value?.toLowerCase().includes(q)))
  }

  const companyIds = Array.from(new Set(rows.map((row) => row.landlord_company_id).filter(Boolean))) as string[]
  const { data: companies } = companyIds.length ? await supabase.from('companies').select('id, name').in('id', companyIds) : { data: [] }
  const companyMap = new Map(((companies ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]))

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingCity: row.listing_city,
    applicantName: row.applicant_full_name,
    applicantEmail: row.applicant_email,
    queuePoints: row.queue_points_snapshot,
    landlordCompanyId: row.landlord_company_id,
    landlordCompanyName: row.landlord_company_id ? companyMap.get(row.landlord_company_id) ?? null : null,
  }))
}

export async function getAdminInquiries(params: { q?: string; status?: string; segment?: string } = {}): Promise<AdminInquiryRow[]> {
  const { supabase } = await getAdminClient()
  let query = supabase
    .from('listing_inquiries')
    .select('id, status, inquiry_type, created_at, listing_id, listing_title, listing_city, listing_segment, requester_full_name, requester_email, requester_phone, requester_company_name, landlord_company_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params.segment && params.segment !== 'all') query = query.eq('listing_segment', params.segment)

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch admin inquiries', error)
    return [] as AdminInquiryRow[]
  }

  let rows = (data ?? []) as Array<{
    id: string
    status: InquiryStatus
    inquiry_type: string
    created_at: string
    listing_id: string | null
    listing_title: string
    listing_city: string
    listing_segment: ListingSegment
    requester_full_name: string
    requester_email: string
    requester_phone: string | null
    requester_company_name: string | null
    landlord_company_id: string | null
  }>

  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((row) => [row.listing_title, row.listing_city, row.requester_full_name, row.requester_email, row.requester_company_name].some((value) => value?.toLowerCase().includes(q)))
  }

  const companyIds = Array.from(new Set(rows.map((row) => row.landlord_company_id).filter(Boolean))) as string[]
  const { data: companies } = companyIds.length ? await supabase.from('companies').select('id, name').in('id', companyIds) : { data: [] }
  const companyMap = new Map(((companies ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]))

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    inquiryType: row.inquiry_type,
    createdAt: row.created_at,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingCity: row.listing_city,
    listingSegment: row.listing_segment,
    requesterName: row.requester_full_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    requesterCompanyName: row.requester_company_name,
    landlordCompanyId: row.landlord_company_id,
    landlordCompanyName: row.landlord_company_id ? companyMap.get(row.landlord_company_id) ?? null : null,
  }))
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const [users, companies, listings, applications, inquiries] = await Promise.all([
    getAdminUsers(),
    getAdminCompanies(),
    getAdminListings(),
    getAdminApplications(),
    getAdminInquiries(),
  ])

  return {
    stats: {
      users: users.length,
      privateUsers: users.filter((user) => user.accountType === 'private').length,
      companyUsers: users.filter((user) => user.accountType === 'company').length,
      companies: companies.length,
      pendingCompanies: companies.filter((company) => company.verificationStatus === 'pending').length,
      listings: listings.length,
      publishedListings: listings.filter((listing) => listing.status === 'published').length,
      applications: applications.length,
      inquiries: inquiries.length,
    },
    latestUsers: users.slice(0, 6),
    latestListings: listings.slice(0, 6),
    pendingCompanies: companies.filter((company) => company.verificationStatus === 'pending').slice(0, 6),
  }
}
