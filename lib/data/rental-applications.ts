import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { DashboardProfileItem, ListingCardItem, ManagedListingItem, PropertyType, RentalApplicationItem, RentalApplicationStatus } from '@/lib/types'
import { getDashboardProfile } from '@/lib/data/profile'
import { getListingBySlug } from '@/lib/search'

type RentalApplicationRow = {
  id: string
  status: RentalApplicationStatus
  created_at: string
  cover_letter: string | null
  queue_points_snapshot: number
  queue_joined_at_snapshot: string | null
  listing_slug: string
  listing_title: string
  listing_city: string
  listing_type: 'rent' | 'sale'
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
  application_id: string
  file_name: string
  file_url: string
  document_type: string
}

type ListingRow = {
  id: string
  slug: string
  title: string
  city: string
  listing_type: 'rent' | 'sale'
  property_type: PropertyType
  status: ManagedListingItem['status']
  price: number
  rooms: number | string | null
  area_sqm: number | string | null
  created_at: string
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

export async function requireSignedInUser() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/login')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) redirect('/login')

  return { supabase, user }
}

export async function getApplyPageData(slug: string) {
  const { user } = await requireSignedInUser()
  const listing = getListingBySlug(slug)
  if (!listing || listing.listingType !== 'rent') redirect(`/listing/${slug}`)

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
        'id, status, created_at, cover_letter, queue_points_snapshot, queue_joined_at_snapshot, listing_slug, listing_title, listing_city, listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone, applicant_monthly_income, applicant_household_size'
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

  return ((applications ?? []) as RentalApplicationRow[]).map((row) => ({
    id: row.id,
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
}

export async function getOwnerDashboardData() {
  const { supabase, user } = await requireSignedInUser()
  const { isSignedIn, profile } = await getDashboardProfile()
  if (!isSignedIn || !profile) redirect('/login')

  const companyIds = profile.companies.map((company) => company.companyId)

  let listingsQuery = supabase
    .from('listings')
    .select('id, slug, title, city, listing_type, property_type, status, price, rooms, area_sqm, created_at')
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

  const { data: applicationCounts } = listingIds.length
    ? await supabase.from('rental_applications').select('listing_id').in('listing_id', listingIds)
    : { data: [] }

  const counts = new Map<string, number>()
  for (const row of (applicationCounts ?? []) as Array<{ listing_id: string }>) {
    counts.set(row.listing_id, (counts.get(row.listing_id) ?? 0) + 1)
  }

  const managedListings: ManagedListingItem[] = ((listings ?? []) as ListingRow[]).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    city: item.city,
    listingType: item.listing_type,
    propertyType: item.property_type,
    status: item.status,
    price: item.price,
    rooms: toNumber(item.rooms),
    areaSqm: toNumber(item.area_sqm),
    createdAt: item.created_at,
    applicationsCount: counts.get(item.id) ?? 0,
  }))

  const incomingQuery = supabase
    .from('rental_applications')
    .select(
      'id, status, created_at, cover_letter, queue_points_snapshot, queue_joined_at_snapshot, listing_slug, listing_title, listing_city, listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone, applicant_monthly_income, applicant_household_size'
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

  return {
    profile,
    listings: managedListings,
    incomingApplications: applications,
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
    price: listing.price,
    imageUrl: listing.imageUrl,
  }
}
