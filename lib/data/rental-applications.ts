import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/permissions'
import type {
  DashboardProfileItem,
  ListingCardItem,
  ListingActivityEventItem,
  ListingEditItem,
  ListingInquiryItem,
  ListingInternalNoteItem,
  ListingRentalRequirementItem,
  ListingSegment,
  ListingType,
  ManagedListingDetailItem,
  ManagedListingItem,
  PropertyType,
  RentalApplicationItem,
  RentalApplicationStatus,
  CommercialType,
  InquiryStatus,
  InvestmentType,
  LandType,
  ParkingType,
  StorageType,
  InquiryType,
} from '@/lib/types'
import { calculateApplicationScore } from '@/lib/dashboard/profile-score'
import { getDashboardProfile } from '@/lib/data/profile'
import { getListingBySlug } from '@/lib/data/listings'
import { parseStorageUri } from '@/lib/storage'

type RentalApplicationRow = {
  id: string
  listing_id: string | null
  status: RentalApplicationStatus
  created_at: string
  cover_letter: string | null
  queue_points_snapshot: number
  queue_joined_at_snapshot: string | null
  random_rank?: number | null
  rejection_reason?: string | null
  listing_slug: string
  listing_title: string
  listing_city: string
  listing_type: ListingType
  listing_price: number
  listing_image_url: string | null
  applicant_full_name: string
  applicant_email: string
  applicant_phone: string | null
  applicant_monthly_income: number | null
  applicant_household_size: number | null
}

type ApplicationCoApplicantRow = {
  application_id: string
  full_name: string
  email: string | null
  phone: string | null
  relationship: string | null
}

type ApplicationDocumentRow = {
  id: string
  application_id: string
  file_name: string
  file_url: string
  document_type: string
}

function getApplicationDocumentUrl(document: ApplicationDocumentRow) {
  return parseStorageUri(document.file_url) ? `/dashboard/applications/documents/${document.id}/view` : document.file_url
}

type ListingRow = {
  id: string
  slug: string
  title: string
  city: string
  listing_type: ListingType
  listing_segment: ListingSegment | null
  property_type: PropertyType
  commercial_type: CommercialType | null
  status: ManagedListingItem['status']
  price: number
  rooms: number | string | null
  area_sqm: number | string | null
  created_at: string
  updated_at?: string | null
}

type InquiryRow = {
  id: string
  listing_id?: string | null
  status: InquiryStatus
  inquiry_type: InquiryType
  created_at: string
  message: string | null
  internal_note?: string | null
  preferred_contact_method: string | null
  requester_full_name: string
  requester_email: string
  requester_phone: string | null
  requester_company_name: string | null
  listing_slug: string
  listing_title: string
  listing_city: string
  listing_type: ListingType
  listing_segment: ListingSegment
  listing_price: number
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

export async function requireSignedInUser() {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login' })
  return { supabase, user }
}

export async function getApplyPageData(slug: string) {
  const { user } = await requireSignedInUser()
  const listing = await getListingBySlug(slug)
  if (!listing || listing.listingType !== 'rent' || listing.listingSegment !== 'residential') redirect(`/listing/${slug}`)

  const { isSignedIn, profile } = await getDashboardProfile()
  if (!isSignedIn || !profile) redirect('/login')

  return {
    userId: user.id,
    listing,
    profile,
  }
}

export async function getUserApplications() {
  const { supabase, user } = await requireSignedInUser()

  const [{ data: applications, error }, { data: coApplicants }, { data: documents }] = await Promise.all([
    supabase
      .from('rental_applications')
      .select(
        'id, listing_id, status, created_at, cover_letter, queue_points_snapshot, queue_joined_at_snapshot, listing_slug, listing_title, listing_city, listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone, applicant_monthly_income, applicant_household_size'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('rental_application_co_applicants')
      .select('application_id, full_name, email, phone, relationship')
      .eq('user_id', user.id),
    supabase
      .from('rental_application_documents')
      .select('application_id, file_name, file_url, document_type')
      .eq('user_id', user.id),
  ])

  if (error) {
    console.error('Failed to fetch user applications', error)
    return [] as RentalApplicationItem[]
  }

  const coApplicantMap = new Map<string, ApplicationCoApplicantRow[]>()
  for (const row of (coApplicants ?? []) as ApplicationCoApplicantRow[]) {
    const current = coApplicantMap.get(row.application_id) ?? []
    current.push(row)
    coApplicantMap.set(row.application_id, current)
  }

  const documentMap = new Map<string, ApplicationDocumentRow[]>()
  for (const row of (documents ?? []) as ApplicationDocumentRow[]) {
    const current = documentMap.get(row.application_id) ?? []
    current.push(row)
    documentMap.set(row.application_id, current)
  }

  const listingIds = Array.from(new Set(((applications ?? []) as RentalApplicationRow[]).map((row) => row.listing_id).filter(Boolean))) as string[]
  const { data: listingApplicationRows } = listingIds.length
    ? await supabase.from('rental_applications').select('listing_id').in('listing_id', listingIds)
    : { data: [] }

  const applicantsCountMap = new Map<string, number>()
  for (const row of (listingApplicationRows ?? []) as Array<{ listing_id: string }>) {
    applicantsCountMap.set(row.listing_id, (applicantsCountMap.get(row.listing_id) ?? 0) + 1)
  }

  // Status timeline for the applicant's own applications.
  const applicationIds = ((applications ?? []) as RentalApplicationRow[]).map((row) => row.id)
  const { data: historyRows } = applicationIds.length
    ? await supabase
        .from('rental_application_status_history')
        .select('application_id, from_status, to_status, note, created_at')
        .in('application_id', applicationIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const historyMap = new Map<string, Array<{ fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>>()
  for (const row of historyRows ?? []) {
    const current = historyMap.get(row.application_id) ?? []
    current.push({ fromStatus: row.from_status, toStatus: row.to_status, note: row.note, createdAt: row.created_at })
    historyMap.set(row.application_id, current)
  }

  return ((applications ?? []) as RentalApplicationRow[]).map((row) => ({
    history: historyMap.get(row.id) ?? [],
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    createdAt: row.created_at,
    coverLetter: row.cover_letter,
    queuePointsSnapshot: row.queue_points_snapshot,
    queueJoinedAtSnapshot: row.queue_joined_at_snapshot,
    applicantsCountForListing: row.listing_id ? applicantsCountMap.get(row.listing_id) ?? 1 : 1,
    applicantScore: calculateApplicationScore({
      id: row.id,
      listingId: row.listing_id,
      status: row.status,
      createdAt: row.created_at,
      coverLetter: row.cover_letter,
      queuePointsSnapshot: row.queue_points_snapshot,
      queueJoinedAtSnapshot: row.queue_joined_at_snapshot,
      listing: { slug: row.listing_slug, title: row.listing_title, city: row.listing_city, listingType: row.listing_type, price: row.listing_price, imageUrl: row.listing_image_url },
      applicant: { fullName: row.applicant_full_name, email: row.applicant_email, phone: row.applicant_phone, monthlyIncome: row.applicant_monthly_income, householdSize: row.applicant_household_size },
      coApplicants: (coApplicantMap.get(row.id) ?? []).map((item) => ({ fullName: item.full_name, email: item.email, phone: item.phone, relationship: item.relationship })),
      documents: (documentMap.get(row.id) ?? []).map((item) => ({ fileName: item.file_name, fileUrl: item.file_url, documentType: item.document_type })),
    }),
    listing: {
      slug: row.listing_slug,
      title: row.listing_title,
      city: row.listing_city,
      listingType: row.listing_type,
      price: row.listing_price,
      imageUrl: row.listing_image_url,
    },
    applicant: {
      fullName: row.applicant_full_name,
      email: row.applicant_email,
      phone: row.applicant_phone,
      monthlyIncome: row.applicant_monthly_income,
      householdSize: row.applicant_household_size,
    },
    coApplicants: (coApplicantMap.get(row.id) ?? []).map((item) => ({
      fullName: item.full_name,
      email: item.email,
      phone: item.phone,
      relationship: item.relationship,
    })),
    documents: (documentMap.get(row.id) ?? []).map((item) => ({
      fileName: item.file_name,
      fileUrl: item.file_url,
      documentType: item.document_type,
    })),
  }))
}

export async function getOwnerDashboardData() {
  const { supabase, user } = await requireSignedInUser()
  const { isSignedIn, profile } = await getDashboardProfile()
  if (!isSignedIn || !profile) redirect('/login')

  const companyIds = profile.companies.map((company) => company.companyId)

  let listingsQuery = supabase
    .from('listings')
    .select('id, slug, title, city, listing_type, listing_segment, property_type, commercial_type, status, price, rooms, area_sqm, created_at')
    .order('created_at', { ascending: false })

  if (companyIds.length > 0) {
    listingsQuery = listingsQuery.or(`created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`)
  } else {
    listingsQuery = listingsQuery.eq('created_by', user.id)
  }

  const { data: listings, error: listingsError } = await listingsQuery
  if (listingsError) {
    console.error('Failed to fetch owner listings', listingsError)
  }

  const listingIds = ((listings ?? []) as ListingRow[]).map((item) => item.id)

  const [{ data: applicationCounts }, { data: inquiryCounts }] = listingIds.length
    ? await Promise.all([
        supabase.from('rental_applications').select('listing_id').in('listing_id', listingIds),
        supabase.from('listing_inquiries').select('listing_id').in('listing_id', listingIds),
      ])
    : [{ data: [] }, { data: [] }]

  const appCounts = new Map<string, number>()
  for (const row of (applicationCounts ?? []) as Array<{ listing_id: string }>) {
    appCounts.set(row.listing_id, (appCounts.get(row.listing_id) ?? 0) + 1)
  }

  const leadCounts = new Map<string, number>()
  for (const row of (inquiryCounts ?? []) as Array<{ listing_id: string }>) {
    leadCounts.set(row.listing_id, (leadCounts.get(row.listing_id) ?? 0) + 1)
  }

  const managedListings: ManagedListingItem[] = ((listings ?? []) as ListingRow[]).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    city: item.city,
    listingType: item.listing_type,
    listingSegment: item.listing_segment ?? 'residential',
    propertyType: item.property_type,
    commercialType: item.commercial_type,
    status: item.status,
    price: item.price,
    rooms: toNumber(item.rooms),
    areaSqm: toNumber(item.area_sqm),
    createdAt: item.created_at,
    applicationsCount: appCounts.get(item.id) ?? 0,
    inquiriesCount: leadCounts.get(item.id) ?? 0,
  }))

  const incomingQuery = supabase
    .from('rental_applications')
    .select(
      'id, listing_id, status, created_at, cover_letter, queue_points_snapshot, queue_joined_at_snapshot, listing_slug, listing_title, listing_city, listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone, applicant_monthly_income, applicant_household_size'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  let scopedIncomingQuery = incomingQuery
  if (listingIds.length > 0) {
    scopedIncomingQuery = scopedIncomingQuery.in('listing_id', listingIds)
  } else {
    scopedIncomingQuery = scopedIncomingQuery.eq('landlord_user_id', user.id)
  }

  const { data: incomingApplications, error: incomingError } = await scopedIncomingQuery
  if (incomingError) {
    console.error('Failed to fetch incoming applications', incomingError)
  }

  const incomingIds = ((incomingApplications ?? []) as RentalApplicationRow[]).map((item) => item.id)

  const [{ data: incomingCoApplicants }, { data: incomingDocuments }] = incomingIds.length
    ? await Promise.all([
        supabase
          .from('rental_application_co_applicants')
          .select('application_id, full_name, email, phone, relationship')
          .in('application_id', incomingIds),
        supabase
          .from('rental_application_documents')
          .select('application_id, file_name, file_url, document_type')
          .in('application_id', incomingIds),
      ])
    : [{ data: [] }, { data: [] }]

  const coApplicantMap = new Map<string, ApplicationCoApplicantRow[]>()
  for (const row of (incomingCoApplicants ?? []) as ApplicationCoApplicantRow[]) {
    const current = coApplicantMap.get(row.application_id) ?? []
    current.push(row)
    coApplicantMap.set(row.application_id, current)
  }

  const documentMap = new Map<string, ApplicationDocumentRow[]>()
  for (const row of (incomingDocuments ?? []) as ApplicationDocumentRow[]) {
    const current = documentMap.get(row.application_id) ?? []
    current.push(row)
    documentMap.set(row.application_id, current)
  }

  const applications: RentalApplicationItem[] = ((incomingApplications ?? []) as RentalApplicationRow[]).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    createdAt: row.created_at,
    coverLetter: row.cover_letter,
    queuePointsSnapshot: row.queue_points_snapshot,
    queueJoinedAtSnapshot: row.queue_joined_at_snapshot,
    listing: {
      slug: row.listing_slug,
      title: row.listing_title,
      city: row.listing_city,
      listingType: row.listing_type,
      price: row.listing_price,
      imageUrl: row.listing_image_url,
    },
    applicant: {
      fullName: row.applicant_full_name,
      email: row.applicant_email,
      phone: row.applicant_phone,
      monthlyIncome: row.applicant_monthly_income,
      householdSize: row.applicant_household_size,
    },
    coApplicants: (coApplicantMap.get(row.id) ?? []).map((item) => ({
      fullName: item.full_name,
      email: item.email,
      phone: item.phone,
      relationship: item.relationship,
    })),
    documents: (documentMap.get(row.id) ?? []).map((item) => ({
      fileName: item.file_name,
      fileUrl: item.file_url,
      documentType: item.document_type,
    })),
  }))

  let inquiriesQuery = supabase
    .from('listing_inquiries')
    .select('id, listing_id, status, inquiry_type, created_at, message, internal_note, preferred_contact_method, requester_full_name, requester_email, requester_phone, requester_company_name, listing_slug, listing_title, listing_city, listing_type, listing_segment, listing_price')
    .order('created_at', { ascending: false })
    .limit(30)

  if (listingIds.length > 0) {
    inquiriesQuery = inquiriesQuery.in('listing_id', listingIds)
  } else {
    inquiriesQuery = inquiriesQuery.eq('landlord_user_id', user.id)
  }

  const { data: incomingInquiries, error: inquiryError } = await inquiriesQuery
  if (inquiryError) {
    console.error('Failed to fetch incoming inquiries', inquiryError)
  }

  const inquiries: ListingInquiryItem[] = ((incomingInquiries ?? []) as InquiryRow[]).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    inquiryType: row.inquiry_type,
    createdAt: row.created_at,
    message: row.message,
    internalNote: row.internal_note ?? null,
    preferredContactMethod: row.preferred_contact_method,
    requester: {
      fullName: row.requester_full_name,
      email: row.requester_email,
      phone: row.requester_phone,
      companyName: row.requester_company_name,
    },
    listing: {
      slug: row.listing_slug,
      title: row.listing_title,
      city: row.listing_city,
      listingType: row.listing_type,
      listingSegment: row.listing_segment,
      price: row.listing_price,
    },
  }))

  return {
    profile,
    listings: managedListings,
    incomingApplications: applications,
    incomingInquiries: inquiries,
  }
}

export function buildApplicantFullName(profile: DashboardProfileItem) {
  return `${profile.firstName} ${profile.lastName}`.trim() || profile.email
}

export function buildListingSnapshot(listing: ListingCardItem) {
  return {
    slug: listing.slug,
    title: listing.title,
    city: listing.city,
    listingType: listing.listingType,
    listingSegment: listing.listingSegment,
    price: listing.price,
    imageUrl: listing.imageUrl,
  }
}

type ManagedListingDetailRow = ListingRow & {
  description: string | null
  street: string | null
  area_name: string | null
  available_from: string | null
}

type ManagedListingEditRow = ManagedListingDetailRow & {
  zip_code: string | null
  parking_type: ParkingType | null
  storage_type: StorageType | null
  land_type: LandType | null
  investment_type: InvestmentType | null
  business_purpose: string | null
  is_vat_applicable: boolean | null
  monthly_service_fee: number | string | null
  price_per_sqm: number | string | null
  min_lease_months: number | string | null
  annual_income: number | string | null
  operating_cost: number | string | null
  cap_rate: number | string | null
  units_count: number | string | null
  created_by: string | null
  company_id: string | null
  is_student_housing?: boolean | null
  is_senior_housing?: boolean | null
  is_short_term?: boolean | null
  has_accessibility?: boolean | null
  application_deadline?: string | null
  viewing_info?: string | null
  policy_summary?: string | null
  hide_exact_address?: boolean | null
  show_applicant_count?: boolean | null
}

type ListingInternalNoteRow = {
  id: string
  note: string
  created_at: string
  created_by: string | null
}

type ListingActivityEventRow = {
  id: string
  event_type: string
  message: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

type ListingFeatureRow = {
  feature_label: string
}

type RentalRequirementRow = {
  min_income: number | null
  pets_allowed: boolean | null
  employment_required: boolean | null
  references_required: boolean | null
}

type ListingImageRow = {
  id: string
  image_url: string
  alt_text: string | null
  is_cover: boolean
  position: number
}

function mapApplicationRows(
  rows: RentalApplicationRow[],
  coApplicants: ApplicationCoApplicantRow[],
  documents: ApplicationDocumentRow[],
) {
  const coApplicantMap = new Map<string, ApplicationCoApplicantRow[]>()
  for (const row of coApplicants) {
    const current = coApplicantMap.get(row.application_id) ?? []
    current.push(row)
    coApplicantMap.set(row.application_id, current)
  }

  const documentMap = new Map<string, ApplicationDocumentRow[]>()
  for (const row of documents) {
    const current = documentMap.get(row.application_id) ?? []
    current.push(row)
    documentMap.set(row.application_id, current)
  }

  return rows.map((row) => {
    const item: RentalApplicationItem = {
      id: row.id,
      listingId: row.listing_id,
      status: row.status,
      createdAt: row.created_at,
      coverLetter: row.cover_letter,
      queuePointsSnapshot: row.queue_points_snapshot,
      queueJoinedAtSnapshot: row.queue_joined_at_snapshot,
      randomRank: row.random_rank ?? null,
      rejectionReason: row.rejection_reason ?? null,
      listing: {
        slug: row.listing_slug,
        title: row.listing_title,
        city: row.listing_city,
        listingType: row.listing_type,
        price: row.listing_price,
        imageUrl: row.listing_image_url,
      },
      applicant: {
        fullName: row.applicant_full_name,
        email: row.applicant_email,
        phone: row.applicant_phone,
        monthlyIncome: row.applicant_monthly_income,
        householdSize: row.applicant_household_size,
      },
      coApplicants: (coApplicantMap.get(row.id) ?? []).map((applicant) => ({
        fullName: applicant.full_name,
        email: applicant.email,
        phone: applicant.phone,
        relationship: applicant.relationship,
      })),
      documents: (documentMap.get(row.id) ?? []).map((document) => ({
        fileName: document.file_name,
        fileUrl: document.file_url,
        documentType: document.document_type,
      })),
    }

    item.applicantScore = calculateApplicationScore(item)
    return item
  })
}

export async function getManagedListingDetail(listingId: string): Promise<ManagedListingDetailItem | null> {
  const { supabase, user } = await requireSignedInUser()
  const { isSignedIn, profile } = await getDashboardProfile()
  if (!isSignedIn || !profile) redirect('/login')

  const companyIds = profile.companies.map((company) => company.companyId)

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, slug, title, description, street, area_name, available_from, city, listing_type, listing_segment, property_type, commercial_type, status, price, rooms, area_sqm, created_at, updated_at, created_by, company_id, selection_method, application_deadline')
    .eq('id', listingId)
    .maybeSingle<ManagedListingDetailRow & { created_by: string | null; company_id: string | null; selection_method?: string | null; application_deadline?: string | null }>()

  if (error) {
    console.error('Failed to fetch managed listing detail', error)
    return null
  }

  if (!listing) return null

  const ownsListing = listing.created_by === user.id || (listing.company_id ? companyIds.includes(listing.company_id) : false)
  if (!ownsListing && !['admin', 'super_admin'].includes(profile.role)) return null

  const [{ data: images }, { data: applicationRows }, { data: inquiryRows }, { data: internalNotes }, { data: activityEvents }] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id, image_url, alt_text, is_cover, position')
      .eq('listing_id', listingId)
      .order('position', { ascending: true }),
    supabase
      .from('rental_applications')
      .select('id, listing_id, status, created_at, cover_letter, queue_points_snapshot, queue_joined_at_snapshot, listing_slug, listing_title, listing_city, listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone, applicant_monthly_income, applicant_household_size, random_rank, rejection_reason')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false }),
    supabase
      .from('listing_inquiries')
      .select('id, listing_id, status, inquiry_type, created_at, message, internal_note, preferred_contact_method, requester_full_name, requester_email, requester_phone, requester_company_name, listing_slug, listing_title, listing_city, listing_type, listing_segment, listing_price')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false }),
    supabase
      .from('listing_internal_notes')
      .select('id, note, created_at, created_by')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('listing_activity_events')
      .select('id, event_type, message, payload, created_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const applicationIds = ((applicationRows ?? []) as RentalApplicationRow[]).map((item) => item.id)
  const [{ data: coApplicants }, { data: documents }, { data: policyResults }] = applicationIds.length
    ? await Promise.all([
        supabase.from('rental_application_co_applicants').select('application_id, full_name, email, phone, relationship').in('application_id', applicationIds),
        supabase.from('rental_application_documents').select('application_id, file_name, file_url, document_type').in('application_id', applicationIds),
        supabase.from('application_policy_results').select('application_id, result').in('application_id', applicationIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const policyResultMap = new Map<string, string>(
    ((policyResults ?? []) as Array<{ application_id: string; result: string }>).map((row) => [row.application_id, row.result]),
  )

  const applications = mapApplicationRows(
    (applicationRows ?? []) as RentalApplicationRow[],
    (coApplicants ?? []) as ApplicationCoApplicantRow[],
    (documents ?? []) as ApplicationDocumentRow[],
  ).map((application) => ({
    ...application,
    policyResult: (policyResultMap.get(application.id) as RentalApplicationItem['policyResult']) ?? null,
  }))

  const inquiries: ListingInquiryItem[] = ((inquiryRows ?? []) as InquiryRow[]).map((row) => ({
    id: row.id,
    listingId: row.listing_id ?? null,
    status: row.status,
    inquiryType: row.inquiry_type,
    createdAt: row.created_at,
    message: row.message,
    internalNote: row.internal_note ?? null,
    preferredContactMethod: row.preferred_contact_method,
    requester: {
      fullName: row.requester_full_name,
      email: row.requester_email,
      phone: row.requester_phone,
      companyName: row.requester_company_name,
    },
    listing: {
      slug: row.listing_slug,
      title: row.listing_title,
      city: row.listing_city,
      listingType: row.listing_type,
      listingSegment: row.listing_segment,
      price: row.listing_price,
    },
  }))

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    city: listing.city,
    listingType: listing.listing_type,
    listingSegment: listing.listing_segment ?? 'residential',
    propertyType: listing.property_type,
    commercialType: listing.commercial_type,
    status: listing.status,
    price: listing.price,
    rooms: toNumber(listing.rooms),
    areaSqm: toNumber(listing.area_sqm),
    createdAt: listing.created_at,
    updatedAt: listing.updated_at ?? null,
    applicationsCount: applications.length,
    inquiriesCount: inquiries.length,
    description: listing.description,
    street: listing.street,
    areaName: listing.area_name,
    availableFrom: listing.available_from,
    selectionMethod: (listing.selection_method ?? 'manual_with_policy') as NonNullable<ManagedListingDetailItem['selectionMethod']>,
    applicationDeadlineAt: listing.application_deadline ?? null,
    images: ((images ?? []) as ListingImageRow[]).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text,
      isCover: image.is_cover,
      position: image.position,
    })),
    applications,
    inquiries,
    internalNotes: ((internalNotes ?? []) as ListingInternalNoteRow[]).map((note) => ({
      id: note.id,
      note: note.note,
      createdAt: note.created_at,
      createdBy: note.created_by,
    })),
    activityEvents: ((activityEvents ?? []) as ListingActivityEventRow[]).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      message: event.message,
      payload: event.payload ?? {},
      createdAt: event.created_at,
    })),
  }
}

export async function getManagedListingEditData(listingId: string): Promise<ListingEditItem | null> {
  const { supabase, user } = await requireSignedInUser()
  const { isSignedIn, profile } = await getDashboardProfile()
  if (!isSignedIn || !profile) redirect('/login')

  const companyIds = profile.companies.map((company) => company.companyId)

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, slug, title, description, street, area_name, zip_code, available_from, city, listing_type, listing_segment, property_type, commercial_type, parking_type, storage_type, land_type, investment_type, business_purpose, is_vat_applicable, monthly_service_fee, price_per_sqm, min_lease_months, annual_income, operating_cost, cap_rate, units_count, status, price, rooms, area_sqm, created_at, updated_at, created_by, company_id, is_student_housing, is_senior_housing, is_short_term, has_accessibility, application_deadline, viewing_info, policy_summary, hide_exact_address, show_applicant_count')
    .eq('id', listingId)
    .maybeSingle<ManagedListingEditRow>()

  if (error) {
    console.error('Failed to fetch listing edit data', error)
    return null
  }

  if (!listing) return null

  const ownsListing = listing.created_by === user.id || (listing.company_id ? companyIds.includes(listing.company_id) : false)
  if (!ownsListing && !['admin', 'super_admin'].includes(profile.role)) return null

  const [{ data: images }, { data: features }, { data: rentalRequirement }, { data: internalNotes }, { data: activityEvents }] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id, image_url, alt_text, is_cover, position')
      .eq('listing_id', listingId)
      .order('position', { ascending: true }),
    supabase
      .from('listing_features')
      .select('feature_label')
      .eq('listing_id', listingId)
      .order('feature_label', { ascending: true }),
    supabase
      .from('rental_requirements')
      .select('min_income, pets_allowed, employment_required, references_required')
      .eq('listing_id', listingId)
      .maybeSingle<RentalRequirementRow>(),
    supabase
      .from('listing_internal_notes')
      .select('id, note, created_at, created_by')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('listing_activity_events')
      .select('id, event_type, message, payload, created_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const coverImage = ((images ?? []) as ListingImageRow[]).find((image) => image.is_cover) ?? ((images ?? []) as ListingImageRow[])[0] ?? null

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    city: listing.city,
    listingType: listing.listing_type,
    listingSegment: listing.listing_segment ?? 'residential',
    propertyType: listing.property_type,
    commercialType: listing.commercial_type,
    parkingType: listing.parking_type,
    storageType: listing.storage_type,
    landType: listing.land_type,
    investmentType: listing.investment_type,
    businessPurpose: listing.business_purpose,
    isVatApplicable: Boolean(listing.is_vat_applicable),
    monthlyServiceFee: toNumber(listing.monthly_service_fee) || null,
    pricePerSqm: toNumber(listing.price_per_sqm) || null,
    minLeaseMonths: toNumber(listing.min_lease_months) || null,
    annualIncome: toNumber(listing.annual_income) || null,
    operatingCost: toNumber(listing.operating_cost) || null,
    capRate: toNumber(listing.cap_rate) || null,
    unitsCount: toNumber(listing.units_count) || null,
    status: listing.status,
    price: listing.price,
    rooms: toNumber(listing.rooms),
    areaSqm: toNumber(listing.area_sqm),
    createdAt: listing.created_at,
    updatedAt: listing.updated_at ?? null,
    applicationsCount: 0,
    inquiriesCount: 0,
    description: listing.description,
    street: listing.street,
    areaName: listing.area_name,
    zipCode: listing.zip_code,
    availableFrom: listing.available_from,
    isStudentHousing: Boolean(listing.is_student_housing),
    isSeniorHousing: Boolean(listing.is_senior_housing),
    isShortTerm: Boolean(listing.is_short_term),
    hasAccessibility: Boolean(listing.has_accessibility),
    applicationDeadline: listing.application_deadline ?? null,
    viewingInfo: listing.viewing_info ?? null,
    policySummary: listing.policy_summary ?? null,
    hideExactAddress: Boolean(listing.hide_exact_address),
    showApplicantCount: Boolean(listing.show_applicant_count),
    images: ((images ?? []) as ListingImageRow[]).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      altText: image.alt_text,
      isCover: image.is_cover,
      position: image.position,
    })),
    coverImageUrl: coverImage?.image_url ?? null,
    features: ((features ?? []) as ListingFeatureRow[]).map((feature) => feature.feature_label).filter(Boolean),
    rentalRequirements: rentalRequirement ? {
      minIncome: rentalRequirement.min_income,
      petsAllowed: Boolean(rentalRequirement.pets_allowed),
      employmentRequired: Boolean(rentalRequirement.employment_required),
      referencesRequired: Boolean(rentalRequirement.references_required),
    } : null,
    applications: [],
    inquiries: [],
    internalNotes: ((internalNotes ?? []) as ListingInternalNoteRow[]).map((note) => ({
      id: note.id,
      note: note.note,
      createdAt: note.created_at,
      createdBy: note.created_by,
    })),
    activityEvents: ((activityEvents ?? []) as ListingActivityEventRow[]).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      message: event.message,
      payload: event.payload ?? {},
      createdAt: event.created_at,
    })),
  }
}
