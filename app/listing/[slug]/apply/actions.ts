'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getApplyPageData, buildApplicantFullName } from '@/lib/data/rental-applications'
import { requireVerifiedAdult } from '@/lib/data/identity'
import { recordConsent } from '@/lib/consents/consents'
import { checkRateLimit } from '@/lib/rate-limit'
import { getApplicationLimitCheck, getHouseholdCoApplicantPoints } from '@/lib/data/queue'
import { DEFAULT_HOUSEHOLD_QUEUE_RULE, resolveHouseholdQueuePoints } from '@/lib/queue/household'

export async function submitRentalApplication(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
  const coverLetter = String(formData.get('coverLetter') ?? '').trim() || null
  const selectedCoApplicants = formData.getAll('coApplicantIds').map(String)
  const selectedDocuments = formData.getAll('documentIds').map(String)
  const moveInDate = String(formData.get('moveInDate') ?? '').trim() || null
  const monthlyIncomeValue = String(formData.get('monthlyIncome') ?? '').trim()
  const householdSizeValue = String(formData.get('householdSize') ?? '').trim()
  const employmentType = String(formData.get('employmentType') ?? '').trim() || null
  const pets = formData.get('pets') === 'on'
  const smoking = formData.get('smoking') === 'on'
  const dataSharingConsent = formData.get('dataSharingConsent') === 'on'

  const { supabase, user } = await (await import('@/lib/data/rental-applications')).requireSignedInUser()
  const { listing, profile } = await getApplyPageData(slug)

  // Identity gate: applying requires a verified identity and age >= 18.
  const identity = await requireVerifiedAdult(user.id)
  if (!identity.verified) {
    redirect(`/listing/${slug}/apply?error=identity_required`)
  }
  if (!identity.adult) {
    redirect(`/listing/${slug}/apply?error=underage`)
  }

  if (!dataSharingConsent) {
    redirect(`/listing/${slug}/apply?error=consent_required`)
  }

  // Active application limit (server-side; the UI warning is cosmetic).
  const limitCheck = await getApplicationLimitCheck(supabase, user.id)
  if (!limitCheck.canApply) {
    redirect(`/listing/${slug}/apply?error=limit_reached`)
  }

  const allowed = await checkRateLimit(supabase, {
    scope: 'rental_application',
    subject: `${user.id}:${listing.slug}`,
    limit: 5,
    windowSeconds: 60 * 60,
  })

  if (!allowed) {
    redirect(`/listing/${slug}/apply?error=rate_limited`)
  }

  const { data: owner } = await supabase
    .from('listings')
    .select('id, created_by, company_id, application_deadline')
    .eq('slug', listing.slug)
    .maybeSingle<{ id: string; created_by: string | null; company_id: string | null; application_deadline: string | null }>()

  // listing_id is NOT NULL in the database; without an owning listing row the
  // application cannot be stored.
  if (!owner?.id) {
    redirect(`/listing/${slug}/apply?error=failed`)
  }

  // Applications close automatically after the deadline.
  if (owner.application_deadline && new Date(owner.application_deadline).getTime() < Date.now()) {
    redirect(`/listing/${slug}/apply?error=deadline_passed`)
  }

  const { data: existingApplication } = await supabase
    .from('rental_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', owner.id)
    .neq('status', 'withdrawn')
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingApplication) {
    redirect('/dashboard/applications?duplicate=1')
  }

  // Household queue rule: with linked, accepted co-applicants the effective
  // queue points follow the configured rule (default: highest in household).
  const ownPoints = profile.queueMembership?.currentPoints ?? 0
  const selectedCoApplicantSet = new Set(selectedCoApplicants)
  const linkedCoApplicantPoints =
    selectedCoApplicants.length > 0
      ? await getHouseholdCoApplicantPoints(supabase)
      : []
  const effectiveQueuePoints = resolveHouseholdQueuePoints(
    DEFAULT_HOUSEHOLD_QUEUE_RULE,
    ownPoints,
    selectedCoApplicantSet.size > 0 ? linkedCoApplicantPoints : [],
  )

  const { data: created, error } = await supabase
    .from('rental_applications')
    .insert({
      user_id: user.id,
      listing_id: owner.id,
      landlord_user_id: owner.created_by ?? null,
      landlord_company_id: owner.company_id ?? null,
      listing_slug: listing.slug,
      listing_title: listing.title,
      listing_city: listing.city,
      listing_type: listing.listingType,
      listing_price: listing.price,
      listing_image_url: listing.imageUrl,
      applicant_full_name: buildApplicantFullName(profile),
      applicant_email: profile.email,
      applicant_phone: profile.phone || null,
      applicant_monthly_income: monthlyIncomeValue ? Number(monthlyIncomeValue) : profile.monthlyIncome,
      applicant_household_size: householdSizeValue ? Number(householdSizeValue) : profile.householdSize,
      queue_points_snapshot: effectiveQueuePoints,
      queue_joined_at_snapshot: profile.queueMembership?.joinedQueueAt ?? null,
      cover_letter: coverLetter,
      move_in_date: moveInDate,
      monthly_income: monthlyIncomeValue ? Number(monthlyIncomeValue) : profile.monthlyIncome,
      employment_type: employmentType ?? profile.employmentStatus ?? null,
      household_size: householdSizeValue ? Number(householdSizeValue) : profile.householdSize,
      pets,
      smoking,
      status: 'submitted',
      applicant_snapshot: profile,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('Failed to create rental application', error)
    redirect(`/listing/${slug}/apply?error=failed`)
  }

  await recordConsent(supabase, { userId: user.id, consentType: 'application_data_sharing', source: 'apply' })
  if (selectedDocuments.length > 0) {
    await recordConsent(supabase, { userId: user.id, consentType: 'document_sharing', source: 'apply' })
  }

  // Immutable snapshot of the applicant profile at submission time. Future
  // profile edits must never mutate what the landlord saw.
  await supabase.from('application_profile_snapshots').insert({
    application_id: created.id,
    user_id: user.id,
    snapshot_version: 1,
    snapshot: JSON.parse(
      JSON.stringify({
        profile,
        selected_co_applicant_ids: selectedCoApplicants,
        selected_document_ids: selectedDocuments,
        submitted_at: new Date().toISOString(),
      }),
    ),
  })

  if (selectedCoApplicants.length > 0) {
    const { data: coApplicants } = await supabase
      .from('co_applicants')
      .select('id, full_name, email, phone, relationship')
      .eq('user_id', user.id)
      .in('id', selectedCoApplicants)

    if (coApplicants?.length) {
      await supabase.from('rental_application_co_applicants').insert(
        coApplicants.map((item) => ({
          application_id: created.id,
          user_id: user.id,
          full_name: item.full_name,
          email: item.email,
          phone: item.phone,
          relationship: item.relationship,
        }))
      )
    }
  }

  if (selectedDocuments.length > 0) {
    const { data: documents } = await supabase
      .from('profile_documents')
      .select('id, file_name, file_url, document_type')
      .eq('user_id', user.id)
      .in('id', selectedDocuments)

    if (documents?.length) {
      await supabase.from('rental_application_documents').insert(
        documents.map((item) => ({
          application_id: created.id,
          user_id: user.id,
          file_name: item.file_name,
          file_url: item.file_url,
          document_type: item.document_type,
        }))
      )
    }
  }

  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Ansökan skickad',
    body: `Din ansökan för ${listing.title} har skickats och sparats i Bovaro.`,
  })

  revalidatePath('/dashboard/applications')
  revalidatePath(`/listing/${slug}`)
  redirect('/dashboard/applications?submitted=1')
}
