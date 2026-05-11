'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getListingBySlug } from '@/lib/data/listings'
import type { InquiryType } from '@/lib/types'

export async function submitListingInquiry(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
  const listing = await getListingBySlug(slug)
  if (!listing) return

  const supabase = await createSupabaseServerClient()
  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim() || null
  const companyName = String(formData.get('companyName') ?? '').trim() || null
  const message = String(formData.get('message') ?? '').trim()
  const budget = String(formData.get('budget') ?? '').trim()
  const desiredTimeline = String(formData.get('desiredTimeline') ?? '').trim()
  const enrichedMessage = [
    message,
    budget ? `Budget: ${budget}` : '',
    desiredTimeline ? `Önskad tidsplan: ${desiredTimeline}` : '',
  ]
    .filter(Boolean)
    .join('\n\n') || null
  const inquiryType = String(formData.get('inquiryType') ?? 'interest') as InquiryType
  const preferredContactMethod = String(formData.get('preferredContactMethod') ?? 'email')

  if (!fullName || !email) return

  const { data: owner } = await supabase
    .from('listings')
    .select('id, created_by, company_id')
    .eq('slug', listing.slug)
    .maybeSingle<{ id: string; created_by: string | null; company_id: string | null }>()

  await supabase.from('listing_inquiries').insert({
    listing_id: owner?.id ?? listing.id,
    user_id: user?.id ?? null,
    landlord_user_id: owner?.created_by ?? null,
    landlord_company_id: owner?.company_id ?? null,
    listing_slug: listing.slug,
    listing_title: listing.title,
    listing_city: listing.city,
    listing_type: listing.listingType,
    listing_segment: listing.listingSegment,
    listing_price: listing.price,
    requester_full_name: fullName,
    requester_email: email,
    requester_phone: phone,
    requester_company_name: companyName,
    inquiry_type: inquiryType,
    preferred_contact_method: preferredContactMethod,
    message: enrichedMessage,
    status: 'new',
  })

  revalidatePath(`/listing/${slug}`)
  redirect(`/listing/${slug}?inquiry=sent`)
}
