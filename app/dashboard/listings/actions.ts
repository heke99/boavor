'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireDashboardAccess, canCreateListing, canManageApplication, canManageInquiry, canManageListing, isAdminRole } from '@/lib/auth/permissions'
import { canTransition } from '@/lib/applications/status-machine'
import { requireSignedInUser } from '@/lib/data/rental-applications'
import { LISTING_IMAGES_BUCKET, sanitizeStorageFileName, validateListingImage } from '@/lib/storage'
import {
  AppRole,
  CommercialType,
  InvestmentType,
  InquiryStatus,
  LandType,
  ListingSegment,
  ListingStatus,
  ListingType,
  ParkingType,
  PropertyType,
  RentalApplicationStatus,
  StorageType,
} from '@/lib/types'
import { getDefaultPropertyType } from '@/lib/listing-options'
import type { Json } from '@/lib/supabase/database.types'

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function roleCanManageListings(role: AppRole) {
  return ['seeker', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(role)
}

function getNullableString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value || null
}

function getNullableNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0)
  return Number.isFinite(value) && value > 0 ? value : null
}

function resolvePropertyType(segment: ListingSegment, formData: FormData) {
  if (segment === 'residential') return String(formData.get('propertyType') ?? 'apartment') as PropertyType
  if (segment === 'commercial') return getDefaultPropertyType(segment, String(formData.get('commercialType') ?? 'retail') as CommercialType)
  return getDefaultPropertyType(segment)
}

async function uploadListingImages(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  formData: FormData,
) {
  const uploadedFiles = [...formData.getAll('imageFiles'), formData.get('imageFile')].filter(
    (file): file is File => file instanceof File && file.size > 0,
  )

  const urls: string[] = []
  for (const uploadedFile of uploadedFiles.slice(0, 8)) {
    const validationError = validateListingImage(uploadedFile)
    if (validationError) {
      console.error('Invalid listing image upload', validationError)
      continue
    }

    const safeFileName = sanitizeStorageFileName(uploadedFile.name)
    const storagePath = `${userId}/${randomUUID()}-${safeFileName}`
    const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(storagePath, uploadedFile, {
      contentType: uploadedFile.type || 'application/octet-stream',
      upsert: false,
    })

    if (error) {
      console.error('Failed to upload listing image', error)
      continue
    }

    urls.push(supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl)
  }

  return urls
}

export async function createListingAction(formData: FormData) {
  const { supabase, user, profile } = await requireDashboardAccess()

  if (!canCreateListing(profile.role)) return

  const title = String(formData.get('title') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  if (!title || !city) return

  const listingType = String(formData.get('listingType') ?? 'rent') as ListingType
  const listingSegment = String(formData.get('listingSegment') ?? 'residential') as ListingSegment
  const propertyType = resolvePropertyType(listingSegment, formData)
  const commercialType = listingSegment === 'commercial' ? (String(formData.get('commercialType') ?? 'retail') as CommercialType) : null
  const parkingType = listingSegment === 'parking' ? (String(formData.get('parkingType') ?? 'outdoor') as ParkingType) : null
  const storageType = listingSegment === 'storage' ? (String(formData.get('storageType') ?? 'storage_unit') as StorageType) : null
  const landType = listingSegment === 'land' ? (String(formData.get('landType') ?? 'land_plot') as LandType) : null
  const investmentType = listingSegment === 'investment' ? (String(formData.get('investmentType') ?? 'rental_property') as InvestmentType) : null
  let status = String(formData.get('status') ?? 'draft') as ListingStatus
  const description = getNullableString(formData, 'description')
  const areaName = getNullableString(formData, 'areaName')
  const street = getNullableString(formData, 'street')
  const zipCode = getNullableString(formData, 'zipCode')
  const price = Number(formData.get('price') ?? 0)
  const monthlyFee = getNullableNumber(formData, 'monthlyFee')
  const rooms = listingSegment === 'residential' ? getNullableNumber(formData, 'rooms') : null
  const areaSqm = getNullableNumber(formData, 'areaSqm')
  const availableFrom = getNullableString(formData, 'availableFrom')
  const uploadedImageUrls = await uploadListingImages(supabase, user.id, formData)
  const imageUrl = uploadedImageUrls[0] ?? getNullableString(formData, 'imageUrl')
  const minLeaseMonths = listingSegment !== 'residential' ? getNullableNumber(formData, 'minLeaseMonths') : null
  const monthlyServiceFee = listingSegment !== 'residential' ? getNullableNumber(formData, 'monthlyServiceFee') : null
  const isVatApplicable = String(formData.get('isVatApplicable') ?? 'false') === 'true'
  const pricePerSqm = areaSqm && price ? Math.round(price / areaSqm) : null
  const annualIncome = getNullableNumber(formData, 'annualIncome')
  const operatingCost = getNullableNumber(formData, 'operatingCost')
  const capRate = getNullableNumber(formData, 'capRate')
  const featuresRaw = String(formData.get('features') ?? '').trim()
  const features = featuresRaw ? featuresRaw.split(',').map((item) => item.trim()).filter(Boolean) : []

  const companyId = profile.companyIds[0] ?? null
  if (companyId && status === 'published') {
    const { data: company } = await supabase
      .from('companies')
      .select('verification_status')
      .eq('id', companyId)
      .maybeSingle<{ verification_status: string | null }>()

    if (company?.verification_status !== 'verified') {
      status = 'draft'
    }
  }

  const slugBase = slugify(title)
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`
  const publishedAt = status === 'published' ? new Date().toISOString() : null

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      company_id: companyId,
      created_by: user.id,
      title,
      slug,
      description,
      listing_type: listingType,
      listing_purpose: listingType,
      listing_segment: listingSegment,
      property_type: propertyType,
      commercial_type: commercialType,
      parking_type: parkingType,
      storage_type: storageType,
      land_type: landType,
      investment_type: investmentType,
      business_purpose: null,
      is_vat_applicable: isVatApplicable,
      monthly_service_fee: monthlyServiceFee,
      price_per_sqm: pricePerSqm,
      min_lease_months: minLeaseMonths,
      annual_income: annualIncome,
      operating_cost: operatingCost,
      cap_rate: capRate,
      status,
      street,
      city,
      zip_code: zipCode,
      area_name: areaName,
      price,
      monthly_fee: monthlyFee,
      area_sqm: areaSqm,
      rooms,
      available_from: availableFrom,
      published_at: publishedAt,
    })
    .select('id')
    .single()

  if (error || !listing) {
    console.error('Failed to create listing', error)
    return
  }

  const imageUrls = imageUrl ? [imageUrl, ...uploadedImageUrls.slice(1)] : uploadedImageUrls
  if (imageUrls.length > 0) {
    await supabase.from('listing_images').insert(
      imageUrls.map((url, index) => ({
        listing_id: listing.id,
        image_url: url,
        position: index,
        is_cover: index === 0,
        alt_text: title,
      })),
    )
  }

  if (features.length > 0) {
    await supabase.from('listing_features').insert(
      features.map((feature) => ({
        listing_id: listing.id,
        feature_key: slugify(feature),
        feature_label: feature,
      }))
    )
  }

  if (listingSegment === 'residential' && listingType === 'rent') {
    await supabase.from('rental_requirements').upsert({
      listing_id: listing.id,
      min_income: Number(formData.get('minIncome') ?? 0) || null,
      pets_allowed: String(formData.get('petsAllowed') ?? 'true') === 'true',
      employment_required: String(formData.get('employmentRequired') ?? 'false') === 'true',
      references_required: String(formData.get('referencesRequired') ?? 'false') === 'true',
    })
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
}

export async function updateApplicationStatusAction(formData: FormData) {
  const { supabase, user, profile } = await requireDashboardAccess()
  const applicationId = String(formData.get('applicationId') ?? '')
  const status = String(formData.get('status') ?? '') as RentalApplicationStatus
  const rejectionReason = String(formData.get('rejectionReason') ?? '').trim() || null
  if (!applicationId || !status) return

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, status, landlord_user_id, landlord_company_id')
    .eq('id', applicationId)
    .maybeSingle<{ id: string; status: string; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!application || !canManageApplication(profile, application)) return

  // Server-side transition guard — the UI dropdown is not authoritative.
  const actor = isAdminRole(profile.role) ? 'admin' : 'landlord'
  if (!canTransition(application.status, status, actor)) {
    console.error('Blocked invalid application status transition', application.status, '→', status)
    return
  }

  // Rejections must carry a reason.
  if (status === 'rejected' && !rejectionReason) return

  const { error } = await supabase
    .from('rental_applications')
    .update({
      status,
      rejection_reason: status === 'rejected' ? rejectionReason : null,
      status_updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) {
    console.error('Failed to update application status', error)
    return
  }

  await supabase.from('rental_application_status_history').insert({
    application_id: applicationId,
    actor_user_id: user.id,
    from_status: application.status as RentalApplicationStatus,
    to_status: status,
    note: rejectionReason,
  })

  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/applications')
}

/**
 * Generates the auditable random order for a listing using the "random"
 * selection method. Only allowed once (ranks are never regenerated) and only
 * after the application deadline has passed.
 */
export async function generateRandomOrderAction(formData: FormData) {
  const { supabase, user, profile } = await requireDashboardAccess()
  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return

  const listing = await userCanManageListing(supabase, user.id, listingId)
  if (!listing) return

  const { data: listingDetails } = await supabase
    .from('listings')
    .select('selection_method, application_deadline')
    .eq('id', listingId)
    .maybeSingle()

  if (listingDetails?.selection_method !== 'random') return
  if (listingDetails.application_deadline && new Date(listingDetails.application_deadline).getTime() > Date.now()) {
    return
  }

  const { data: applications } = await supabase
    .from('rental_applications')
    .select('id, random_rank')
    .eq('listing_id', listingId)

  const unranked = (applications ?? []).filter((row) => row.random_rank === null)
  if (unranked.length === 0) return

  for (const row of unranked) {
    await supabase.from('rental_applications').update({ random_rank: Math.random() }).eq('id', row.id)
  }

  await logListingActivity(supabase, {
    listingId,
    actorUserId: user.id,
    eventType: 'random_order_generated',
    message: `Slumpad urvalsordning genererad för ${unranked.length} ansökningar.`,
    payload: { count: unranked.length, actor_role: profile.role },
  })

  revalidatePath(`/dashboard/listings/${listingId}`)
}

/** Bulk rejection with a shared reason. Each transition is validated. */
export async function bulkRejectApplicationsAction(formData: FormData) {
  const { supabase, user, profile } = await requireDashboardAccess()
  const applicationIds = formData.getAll('applicationIds').map(String).filter(Boolean)
  const rejectionReason = String(formData.get('rejectionReason') ?? '').trim()
  const confirmed = formData.get('confirmBulk') === 'on'
  if (applicationIds.length === 0 || !rejectionReason || !confirmed) return

  const actor = isAdminRole(profile.role) ? 'admin' : 'landlord'

  for (const applicationId of applicationIds) {
    const { data: application } = await supabase
      .from('rental_applications')
      .select('id, status, landlord_user_id, landlord_company_id')
      .eq('id', applicationId)
      .maybeSingle<{ id: string; status: string; landlord_user_id: string | null; landlord_company_id: string | null }>()

    if (!application || !canManageApplication(profile, application)) continue
    if (!canTransition(application.status, 'rejected', actor)) continue

    await supabase
      .from('rental_applications')
      .update({ status: 'rejected', rejection_reason: rejectionReason, status_updated_at: new Date().toISOString() })
      .eq('id', applicationId)

    await supabase.from('rental_application_status_history').insert({
      application_id: applicationId,
      actor_user_id: user.id,
      from_status: application.status as RentalApplicationStatus,
      to_status: 'rejected',
      note: `Bulk: ${rejectionReason}`,
    })
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/applications')
}

/** "Request more info" — notifies the applicant with a permission check in SQL. */
export async function requestApplicationInfoAction(formData: FormData) {
  const { supabase, user } = await requireDashboardAccess()
  const applicationId = String(formData.get('applicationId') ?? '')
  const message = String(formData.get('message') ?? '').trim()
  if (!applicationId || !message) return

  const { error } = await supabase.rpc('notify_application_applicant', {
    p_application_id: applicationId,
    p_title: 'Hyresvärden behöver komplettering',
    p_body: message,
  })

  if (error) {
    console.error('Failed to request application info', error)
    return
  }

  const { data: application } = await supabase
    .from('rental_applications')
    .select('status')
    .eq('id', applicationId)
    .maybeSingle()

  if (application) {
    await supabase.from('rental_application_status_history').insert({
      application_id: applicationId,
      actor_user_id: user.id,
      from_status: application.status,
      to_status: application.status,
      note: `Kompletteringsbegäran: ${message}`,
    })
  }

  revalidatePath('/dashboard/listings')
}

export async function updateInquiryStatusAction(formData: FormData) {
  const { supabase, profile } = await requireDashboardAccess()
  const inquiryId = String(formData.get('inquiryId') ?? '')
  const status = String(formData.get('status') ?? 'contacted') as InquiryStatus
  const internalNote = String(formData.get('internalNote') ?? '').trim() || null
  if (!inquiryId) return

  const { data: inquiry } = await supabase
    .from('listing_inquiries')
    .select('id, listing_id, landlord_user_id, landlord_company_id')
    .eq('id', inquiryId)
    .maybeSingle<{ id: string; listing_id: string | null; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!inquiry) return

  let listing = null
  if (inquiry.listing_id) {
    const { data } = await supabase
      .from('listings')
      .select('id, created_by, company_id')
      .eq('id', inquiry.listing_id)
      .maybeSingle<{ id: string; created_by: string | null; company_id: string | null }>()
    listing = data
  }

  if (!canManageInquiry(profile, { ...inquiry, listing })) return

  await supabase
    .from('listing_inquiries')
    .update({ status, internal_note: internalNote })
    .eq('id', inquiryId)

  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/inquiries')
}

export async function updateListingStatusAction(formData: FormData) {
  const { supabase, user, profile } = await requireDashboardAccess()
  const listingId = String(formData.get('listingId') ?? '')
  const status = String(formData.get('status') ?? 'paused') as ListingStatus
  if (!listingId) return

  const { data: listing } = await supabase
    .from('listings')
    .select('id, status, created_by, company_id')
    .eq('id', listingId)
    .maybeSingle<{ id: string; status: ListingStatus; created_by: string | null; company_id: string | null }>()

  if (!canManageListing(profile, listing)) return
  if (!listing) return

  await supabase
    .from('listings')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', listingId)

  await supabase.from('listing_activity_events').insert({
    listing_id: listingId,
    actor_user_id: user.id,
    event_type: 'status_changed',
    message: `Status ändrades till ${status}.`,
    payload: { previous_status: listing.status, new_status: status },
  })

  // Publication audit trail.
  const publicationAction =
    status === 'published' ? 'published' : status === 'paused' ? 'paused' : status === 'archived' ? 'archived' : status === 'rented' ? 'rented' : 'unpublished'
  await supabase.from('listing_publications').insert({
    listing_id: listingId,
    action: publicationAction,
    actor_user_id: user.id,
    note: `Från ${listing.status} till ${status}`,
  })

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
}

/** Duplicates a listing as a new draft (images/features copied). */
export async function duplicateListingAction(formData: FormData) {
  const { supabase, user } = await requireDashboardAccess()
  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return

  const canManage = await userCanManageListing(supabase, user.id, listingId)
  if (!canManage) return

  const { data: source } = await supabase.from('listings').select('*').eq('id', listingId).maybeSingle()
  if (!source) return

  const copy: Record<string, unknown> = { ...source }
  delete copy.id
  delete copy.created_at
  delete copy.updated_at
  copy.title = `${source.title} (kopia)`
  copy.slug = `${source.slug}-kopia-${Date.now().toString(36)}`
  copy.status = 'draft'
  copy.published_at = null
  copy.scheduled_publish_at = null
  copy.created_by = user.id

  const { data: created, error } = await supabase
    .from('listings')
    .insert(copy as never)
    .select('id')
    .single()

  if (error || !created) {
    console.error('Failed to duplicate listing', error)
    return
  }

  const [{ data: images }, { data: features }] = await Promise.all([
    supabase.from('listing_images').select('image_url, alt_text, position, is_cover').eq('listing_id', listingId),
    supabase.from('listing_features').select('feature_key, feature_label').eq('listing_id', listingId),
  ])

  if (images?.length) {
    await supabase.from('listing_images').insert(images.map((image) => ({ ...image, listing_id: created.id })))
  }
  if (features?.length) {
    await supabase.from('listing_features').insert(features.map((feature) => ({ ...feature, listing_id: created.id })))
  }

  redirect(`/dashboard/listings/${created.id}/edit`)
}

/** Schedules a listing for future publication (activated by the cron job). */
export async function schedulePublishAction(formData: FormData) {
  const { supabase, user } = await requireDashboardAccess()
  const listingId = String(formData.get('listingId') ?? '')
  const publishAt = String(formData.get('publishAt') ?? '').trim()
  if (!listingId) return

  const canManage = await userCanManageListing(supabase, user.id, listingId)
  if (!canManage) return

  const scheduledAt = publishAt ? new Date(publishAt).toISOString() : null

  await supabase.from('listings').update({ scheduled_publish_at: scheduledAt }).eq('id', listingId)

  if (scheduledAt) {
    await supabase.from('listing_publications').insert({
      listing_id: listingId,
      action: 'scheduled',
      actor_user_id: user.id,
      note: `Schemalagd publicering ${scheduledAt}`,
    })
  }

  revalidatePath('/landlord/listings')
  revalidatePath('/dashboard/listings')
}


async function getUserCompanyIds(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  if (!supabase) return [] as string[]
  const { data } = await supabase.from('company_members').select('company_id').eq('user_id', userId)
  return (data ?? []).map((item) => item.company_id as string).filter(Boolean)
}

async function userCanManageListing(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, listingId: string) {
  if (!supabase) return null
  const companyIds = await getUserCompanyIds(supabase, userId)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle<{ role: AppRole }>()
  const { data: listing } = await supabase
    .from('listings')
    .select('id, slug, title, status, price, created_by, company_id')
    .eq('id', listingId)
    .maybeSingle<{ id: string; slug: string; title: string; status: ListingStatus; price: number; created_by: string | null; company_id: string | null }>()

  if (!listing) return null
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const canManage = isAdmin || listing.created_by === userId || Boolean(listing.company_id && companyIds.includes(listing.company_id))
  return canManage ? listing : null
}

async function logListingActivity(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  params: { listingId: string; actorUserId: string; eventType: string; message: string; payload?: Json },
) {
  if (!supabase) return
  await supabase.from('listing_activity_events').insert({
    listing_id: params.listingId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    message: params.message,
    payload: params.payload ?? {},
  })
}

export async function updateListingDetailsAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return

  const existing = await userCanManageListing(supabase, user.id, listingId)
  if (!existing) return

  const title = String(formData.get('title') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  if (!title || !city) return

  const listingType = String(formData.get('listingType') ?? 'rent') as ListingType
  const listingSegment = String(formData.get('listingSegment') ?? 'residential') as ListingSegment
  const propertyType = resolvePropertyType(listingSegment, formData)
  const commercialType = listingSegment === 'commercial' ? (String(formData.get('commercialType') ?? 'retail') as CommercialType) : null
  const parkingType = listingSegment === 'parking' ? (String(formData.get('parkingType') ?? 'outdoor') as ParkingType) : null
  const storageType = listingSegment === 'storage' ? (String(formData.get('storageType') ?? 'storage_unit') as StorageType) : null
  const landType = listingSegment === 'land' ? (String(formData.get('landType') ?? 'land_plot') as LandType) : null
  const investmentType = listingSegment === 'investment' ? (String(formData.get('investmentType') ?? 'rental_property') as InvestmentType) : null
  let status = String(formData.get('status') ?? 'draft') as ListingStatus
  if (existing.company_id && status === 'published') {
    const { data: company } = await supabase
      .from('companies')
      .select('verification_status')
      .eq('id', existing.company_id)
      .maybeSingle<{ verification_status: string | null }>()

    if (company?.verification_status !== 'verified') {
      status = 'draft'
    }
  }

  const price = Number(formData.get('price') ?? 0)
  const areaSqm = getNullableNumber(formData, 'areaSqm')
  const featuresRaw = String(formData.get('features') ?? '').trim()
  const features = Array.from(new Set(featuresRaw ? featuresRaw.split(',').map((item) => item.trim()).filter(Boolean) : []))
  const uploadedImageUrls = await uploadListingImages(supabase, user.id, formData)
  const imageUrl = uploadedImageUrls[0] ?? getNullableString(formData, 'imageUrl')
  const pricePerSqm = areaSqm && price ? Math.round(price / areaSqm) : null

  const updatePayload = {
    title,
    description: getNullableString(formData, 'description'),
    listing_type: listingType,
    listing_purpose: listingType,
    listing_segment: listingSegment,
    property_type: propertyType,
    commercial_type: commercialType,
    parking_type: parkingType,
    storage_type: storageType,
    land_type: landType,
    investment_type: investmentType,
    business_purpose: null,
    is_vat_applicable: listingSegment !== 'residential' && String(formData.get('isVatApplicable') ?? 'false') === 'true',
    monthly_service_fee: listingSegment !== 'residential' ? getNullableNumber(formData, 'monthlyServiceFee') : null,
    price_per_sqm: pricePerSqm,
    min_lease_months: listingSegment !== 'residential' ? getNullableNumber(formData, 'minLeaseMonths') : null,
    annual_income: listingSegment === 'investment' ? getNullableNumber(formData, 'annualIncome') : null,
    operating_cost: listingSegment === 'investment' ? getNullableNumber(formData, 'operatingCost') : null,
    cap_rate: listingSegment === 'investment' ? getNullableNumber(formData, 'capRate') : null,
    units_count: listingSegment === 'investment' ? getNullableNumber(formData, 'unitsCount') : null,
    status,
    street: getNullableString(formData, 'street'),
    city,
    zip_code: getNullableString(formData, 'zipCode'),
    area_name: getNullableString(formData, 'areaName'),
    price: Number.isFinite(price) ? price : 0,
    area_sqm: areaSqm,
    rooms: listingSegment === 'residential' ? getNullableNumber(formData, 'rooms') : null,
    available_from: getNullableString(formData, 'availableFrom'),
    published_at: status === 'published' ? new Date().toISOString() : null,
    // Rental process settings (Batch 5/7)
    selection_method: ['strict_queue', 'guided_queue', 'first_come', 'random', 'manual_with_policy'].includes(
      String(formData.get('selectionMethod') ?? ''),
    )
      ? String(formData.get('selectionMethod'))
      : 'manual_with_policy',
    is_student_housing: formData.get('isStudentHousing') === 'on',
    is_senior_housing: formData.get('isSeniorHousing') === 'on',
    is_short_term: formData.get('isShortTerm') === 'on',
    has_accessibility: formData.get('hasAccessibility') === 'on',
    application_deadline: getNullableString(formData, 'applicationDeadline'),
    viewing_info: getNullableString(formData, 'viewingInfo'),
    policy_summary: getNullableString(formData, 'policySummary'),
    hide_exact_address: formData.get('hideExactAddress') === 'on',
    show_applicant_count: formData.get('showApplicantCount') === 'on',
  }

  const { error } = await supabase.from('listings').update(updatePayload).eq('id', listingId)
  if (error) {
    console.error('Failed to update listing', error)
    return
  }

  // Policy assignment for Matchkoll (empty value = legacy rental requirements).
  const policyId = String(formData.get('policyId') ?? '').trim()
  if (policyId) {
    await supabase
      .from('listing_policy_assignments')
      .upsert({ listing_id: listingId, policy_id: policyId }, { onConflict: 'listing_id' })
  } else if (formData.has('policyId')) {
    await supabase.from('listing_policy_assignments').delete().eq('listing_id', listingId)
  }

  await supabase.from('listing_features').delete().eq('listing_id', listingId)
  if (features.length > 0) {
    await supabase.from('listing_features').insert(
      features.map((feature) => ({
        listing_id: listingId,
        feature_key: slugify(feature),
        feature_label: feature,
      })),
    )
  }

  if (imageUrl) {
    const { data: coverImage } = await supabase
      .from('listing_images')
      .select('id')
      .eq('listing_id', listingId)
      .eq('is_cover', true)
      .maybeSingle<{ id: string }>()

    if (coverImage) {
      await supabase.from('listing_images').update({ image_url: imageUrl, alt_text: title }).eq('id', coverImage.id)
    } else {
      await supabase.from('listing_images').insert({ listing_id: listingId, image_url: imageUrl, alt_text: title, is_cover: true, position: 0 })
    }
  }

  if (uploadedImageUrls.length > 1) {
    await supabase.from('listing_images').insert(
      uploadedImageUrls.slice(1).map((url, index) => ({
        listing_id: listingId,
        image_url: url,
        alt_text: title,
        is_cover: false,
        position: index + 1,
      })),
    )
  }

  if (listingSegment === 'residential' && listingType === 'rent') {
    await supabase.from('rental_requirements').upsert({
      listing_id: listingId,
      min_income: getNullableNumber(formData, 'minIncome'),
      pets_allowed: String(formData.get('petsAllowed') ?? 'true') === 'true',
      employment_required: String(formData.get('employmentRequired') ?? 'false') === 'true',
      references_required: String(formData.get('referencesRequired') ?? 'false') === 'true',
    })
  }

  await logListingActivity(supabase, {
    listingId,
    actorUserId: user.id,
    eventType: 'listing_updated',
    message: 'Objektet uppdaterades.',
    payload: {
      previous_status: existing.status,
      new_status: status,
      previous_price: existing.price,
      new_price: price,
    },
  })

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}`)
  revalidatePath(`/dashboard/listings/${listingId}/edit`)
  revalidatePath('/listings')
  revalidatePath(`/listing/${existing.slug}`)
}

export async function addListingInternalNoteAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const listingId = String(formData.get('listingId') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  if (!listingId || !note) return

  const listing = await userCanManageListing(supabase, user.id, listingId)
  if (!listing) return

  await supabase.from('listing_internal_notes').insert({
    listing_id: listingId,
    created_by: user.id,
    note,
  })

  await logListingActivity(supabase, {
    listingId,
    actorUserId: user.id,
    eventType: 'internal_note_added',
    message: 'Intern anteckning lades till.',
  })

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}`)
  revalidatePath(`/dashboard/listings/${listingId}/edit`)
}
