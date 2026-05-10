'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireDashboardAccess, canCreateListing, canManageApplication, canManageInquiry, canManageListing } from '@/lib/auth/permissions'
import { requireSignedInUser } from '@/lib/data/rental-applications'
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
  const status = String(formData.get('status') ?? 'draft') as ListingStatus
  const description = getNullableString(formData, 'description')
  const areaName = getNullableString(formData, 'areaName')
  const street = getNullableString(formData, 'street')
  const zipCode = getNullableString(formData, 'zipCode')
  const price = Number(formData.get('price') ?? 0)
  const monthlyFee = getNullableNumber(formData, 'monthlyFee')
  const rooms = listingSegment === 'residential' ? getNullableNumber(formData, 'rooms') : null
  const areaSqm = getNullableNumber(formData, 'areaSqm')
  const availableFrom = getNullableString(formData, 'availableFrom')
  const imageUrl = getNullableString(formData, 'imageUrl')
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

  if (imageUrl) {
    await supabase.from('listing_images').insert({
      listing_id: listing.id,
      image_url: imageUrl,
      position: 0,
      is_cover: true,
      alt_text: title,
    })
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
  const { supabase, profile } = await requireDashboardAccess()
  const applicationId = String(formData.get('applicationId') ?? '')
  const status = String(formData.get('status') ?? 'reviewing') as RentalApplicationStatus
  if (!applicationId) return

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, landlord_user_id, landlord_company_id')
    .eq('id', applicationId)
    .maybeSingle<{ id: string; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!canManageApplication(profile, application)) return

  await supabase.from('rental_applications').update({ status }).eq('id', applicationId)
  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/applications')
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

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
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
  params: { listingId: string; actorUserId: string; eventType: string; message: string; payload?: Record<string, unknown> },
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
  const status = String(formData.get('status') ?? 'draft') as ListingStatus
  const price = Number(formData.get('price') ?? 0)
  const areaSqm = getNullableNumber(formData, 'areaSqm')
  const featuresRaw = String(formData.get('features') ?? '').trim()
  const features = Array.from(new Set(featuresRaw ? featuresRaw.split(',').map((item) => item.trim()).filter(Boolean) : []))
  const imageUrl = getNullableString(formData, 'imageUrl')
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
  }

  const { error } = await supabase.from('listings').update(updatePayload).eq('id', listingId)
  if (error) {
    console.error('Failed to update listing', error)
    return
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
