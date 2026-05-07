'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireSignedInUser } from '@/lib/data/rental-applications'
import { AppRole, ListingStatus, ListingType, PropertyType, RentalApplicationStatus } from '@/lib/types'

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
  return ['landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(role)
}

export async function createListingAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: AppRole }>()
  if (!profile || !roleCanManageListings(profile.role)) return

  const title = String(formData.get('title') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  if (!title || !city) return

  const listingType = String(formData.get('listingType') ?? 'rent') as ListingType
  const propertyType = String(formData.get('propertyType') ?? 'apartment') as PropertyType
  const status = String(formData.get('status') ?? 'draft') as ListingStatus
  const description = String(formData.get('description') ?? '').trim() || null
  const areaName = String(formData.get('areaName') ?? '').trim() || null
  const street = String(formData.get('street') ?? '').trim() || null
  const zipCode = String(formData.get('zipCode') ?? '').trim() || null
  const price = Number(formData.get('price') ?? 0)
  const monthlyFee = Number(formData.get('monthlyFee') ?? 0) || null
  const rooms = Number(formData.get('rooms') ?? 0) || null
  const areaSqm = Number(formData.get('areaSqm') ?? 0) || null
  const availableFrom = String(formData.get('availableFrom') ?? '').trim() || null
  const imageUrl = String(formData.get('imageUrl') ?? '').trim() || null
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
      property_type: propertyType,
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

  if (listingType === 'rent') {
    await supabase.from('rental_requirements').upsert({
      listing_id: listing.id,
      min_income: Number(formData.get('minIncome') ?? 0) || null,
      pets_allowed: String(formData.get('petsAllowed') ?? 'true') === 'true',
      employment_required: String(formData.get('employmentRequired') ?? 'false') === 'true',
      references_required: String(formData.get('referencesRequired') ?? 'false') === 'true',
    })
  }

  revalidatePath('/dashboard/listings')
}

export async function updateApplicationStatusAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const applicationId = String(formData.get('applicationId') ?? '')
  const status = String(formData.get('status') ?? 'reviewing') as RentalApplicationStatus
  if (!applicationId) return

  const { data: membership } = await supabase.from('company_members').select('company_id').eq('user_id', user.id)
  const companyIds = (membership ?? []).map((item) => item.company_id)

  let lookup = supabase.from('rental_applications').select('id, landlord_user_id, landlord_company_id').eq('id', applicationId)
  const { data: application } = await lookup.maybeSingle<{ id: string; landlord_user_id: string | null; landlord_company_id: string | null }>()
  if (!application) return

  const canManage = application.landlord_user_id === user.id || (application.landlord_company_id && companyIds.includes(application.landlord_company_id))
  if (!canManage) return

  await supabase.from('rental_applications').update({ status }).eq('id', applicationId)
  revalidatePath('/dashboard/listings')
  revalidatePath('/dashboard/applications')
}
