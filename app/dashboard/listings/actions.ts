'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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
  const { supabase, user } = await requireSignedInUser()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: AppRole }>()
  if (!profile || !roleCanManageListings(profile.role)) return

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

  const { data: companyMembership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle<{ company_id: string }>()

  const slugBase = slugify(title)
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`
  const publishedAt = status === 'published' ? new Date().toISOString() : null

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      company_id: companyMembership?.company_id ?? null,
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
  const { supabase, user } = await requireSignedInUser()
  const applicationId = String(formData.get('applicationId') ?? '')
  const status = String(formData.get('status') ?? 'reviewing') as RentalApplicationStatus
  if (!applicationId) return

  const { data: membership } = await supabase.from('company_members').select('company_id').eq('user_id', user.id)
  const companyIds = (membership ?? []).map((item) => item.company_id)

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, landlord_user_id, landlord_company_id')
    .eq('id', applicationId)
    .maybeSingle<{ id: string; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!application) return

  const canManage = application.landlord_user_id === user.id || (application.landlord_company_id && companyIds.includes(application.landlord_company_id))
  if (!canManage) return

  await supabase.from('rental_applications').update({ status }).eq('id', applicationId)
  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/applications')
}

export async function updateInquiryStatusAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const inquiryId = String(formData.get('inquiryId') ?? '')
  const status = String(formData.get('status') ?? 'contacted') as InquiryStatus
  const internalNote = String(formData.get('internalNote') ?? '').trim() || null
  if (!inquiryId) return

  const { data: membership } = await supabase.from('company_members').select('company_id').eq('user_id', user.id)
  const companyIds = (membership ?? []).map((item) => item.company_id)

  const { data: inquiry } = await supabase
    .from('listing_inquiries')
    .select('id, listing_id, landlord_user_id, landlord_company_id')
    .eq('id', inquiryId)
    .maybeSingle<{ id: string; listing_id: string | null; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!inquiry) return

  let ownsListing = false
  if (inquiry.listing_id) {
    const { data: listing } = await supabase
      .from('listings')
      .select('created_by, company_id')
      .eq('id', inquiry.listing_id)
      .maybeSingle<{ created_by: string | null; company_id: string | null }>()
    ownsListing = listing?.created_by === user.id || Boolean(listing?.company_id && companyIds.includes(listing.company_id))
  }

  const canManage = inquiry.landlord_user_id === user.id || (inquiry.landlord_company_id && companyIds.includes(inquiry.landlord_company_id)) || ownsListing
  if (!canManage) return

  await supabase
    .from('listing_inquiries')
    .update({ status, internal_note: internalNote })
    .eq('id', inquiryId)

  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/inquiries')
}

export async function updateListingStatusAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const listingId = String(formData.get('listingId') ?? '')
  const status = String(formData.get('status') ?? 'paused') as ListingStatus
  if (!listingId) return

  const { data: membership } = await supabase.from('company_members').select('company_id').eq('user_id', user.id)
  const companyIds = (membership ?? []).map((item) => item.company_id)

  const { data: listing } = await supabase
    .from('listings')
    .select('id, created_by, company_id')
    .eq('id', listingId)
    .maybeSingle<{ id: string; created_by: string | null; company_id: string | null }>()

  if (!listing) return

  const canManage = listing.created_by === user.id || Boolean(listing.company_id && companyIds.includes(listing.company_id))
  if (!canManage) return

  await supabase
    .from('listings')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', listingId)

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
}

