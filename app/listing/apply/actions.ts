'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getApplyPageData, buildApplicantFullName } from '@/lib/data/rental-applications'

export async function submitRentalApplication(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
  const coverLetter = String(formData.get('coverLetter') ?? '').trim() || null
  const selectedCoApplicants = formData.getAll('coApplicantIds').map(String)
  const selectedDocuments = formData.getAll('documentIds').map(String)

  const { supabase, user } = await (await import('@/lib/data/rental-applications')).requireSignedInUser()
  const { listing, profile } = await getApplyPageData(slug)

  const { data: created, error } = await supabase
    .from('rental_applications')
    .insert({
      user_id: user.id,
      listing_id: null,
      landlord_user_id: null,
      landlord_company_id: profile.companies[0]?.companyId ?? null,
      listing_slug: listing.slug,
      listing_title: listing.title,
      listing_city: listing.city,
      listing_type: listing.listingType,
      listing_price: listing.price,
      listing_image_url: listing.imageUrl,
      applicant_full_name: buildApplicantFullName(profile),
      applicant_email: profile.email,
      applicant_phone: profile.phone || null,
      applicant_monthly_income: profile.monthlyIncome,
      applicant_household_size: profile.householdSize,
      queue_points_snapshot: profile.queueMembership?.currentPoints ?? 0,
      queue_joined_at_snapshot: profile.queueMembership?.joinedQueueAt ?? null,
      cover_letter: coverLetter,
      status: 'submitted',
      applicant_snapshot: profile,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('Failed to create rental application', error)
    return
  }

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
