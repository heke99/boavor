'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getListingBySlug } from '@/lib/data/listings'
import { runMatchkoll } from '@/lib/data/matchkoll'
import { requireVerifiedAdult } from '@/lib/data/identity'
import { checkRateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/track'
import type { InquiryType } from '@/lib/types'

export async function runMatchkollAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
  if (!slug) return

  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect(`/listing/${slug}?matchkoll=unavailable`)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/listing/${slug}`)}`)
  }

  const identity = await requireVerifiedAdult(user.id)
  if (!identity.verified) {
    redirect(`/listing/${slug}?matchkoll=identity_required`)
  }

  const allowed = await checkRateLimit(supabase, {
    scope: 'matchkoll',
    subject: `${user.id}:${slug}`,
    limit: 10,
    windowSeconds: 60 * 60,
  })
  if (!allowed) {
    redirect(`/listing/${slug}?matchkoll=rate_limited`)
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, price, listing_type, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!listing || listing.listing_type !== 'rent') {
    redirect(`/listing/${slug}`)
  }

  const run = await runMatchkoll(supabase, {
    userId: user.id,
    listingId: listing.id,
    rentAmount: listing.price,
    context: 'precheck',
  })

  if (!run) {
    redirect(`/listing/${slug}?matchkoll=profile_required`)
  }

  revalidatePath(`/listing/${slug}`)
  redirect(`/listing/${slug}?matchkoll=done`)
}

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

  if (!fullName || !email || !email.includes('@')) {
    redirect(`/listing/${slug}?inquiry=invalid`)
  }

  const allowed = await checkRateLimit(supabase, {
    scope: 'listing_inquiry',
    subject: `${email}:${listing.slug}`,
    limit: 3,
    windowSeconds: 60 * 60,
  })

  if (!allowed) {
    redirect(`/listing/${slug}?inquiry=rate_limited`)
  }

  const { data: owner } = await supabase
    .from('listings')
    .select('id, created_by, company_id')
    .eq('slug', listing.slug)
    .maybeSingle<{ id: string; created_by: string | null; company_id: string | null }>()

  const { error } = await supabase.from('listing_inquiries').insert({
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

  if (error) {
    console.error('Failed to create listing inquiry', error)
    redirect(`/listing/${slug}?inquiry=failed`)
  }

  await trackEvent('inquiry_submitted', {
    listingId: owner?.id ?? listing.id,
    metadata: { inquiry_type: inquiryType, listing_segment: listing.listingSegment },
  })

  revalidatePath(`/listing/${slug}`)
  redirect(`/listing/${slug}?inquiry=sent`)
}
