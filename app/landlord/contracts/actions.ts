'use server'

import { revalidatePath } from 'next/cache'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { canTransition } from '@/lib/applications/status-machine'
import { renderContractTemplate } from '@/lib/contracts/render'
import { resolveEsignProvider } from '@/lib/esign/provider'

export async function sendOfferAction(formData: FormData) {
  const { supabase, user, profile } = await requireLandlordAccess()

  const applicationId = String(formData.get('applicationId') ?? '')
  const message = String(formData.get('message') ?? '').trim()
  const expiresAt = String(formData.get('expiresAt') ?? '').trim()
  if (!applicationId) return

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, user_id, listing_id, status')
    .eq('id', applicationId)
    .maybeSingle()

  if (!application?.user_id) return

  const actor = ['admin', 'super_admin'].includes(profile.role) ? 'admin' : 'landlord'
  if (!canTransition(application.status, 'offered', actor)) return

  const { data: offer, error } = await supabase
    .from('rental_offers')
    .insert({
      application_id: applicationId,
      listing_id: application.listing_id,
      user_id: application.user_id,
      created_by: user.id,
      message: message || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !offer) {
    console.error('Failed to create offer', error)
    return
  }

  await supabase.from('rental_offer_events').insert({
    offer_id: offer.id,
    actor_user_id: user.id,
    event_type: 'offer_sent',
    payload: { expires_at: expiresAt || null },
  })

  await supabase
    .from('rental_applications')
    .update({ status: 'offered', status_updated_at: new Date().toISOString() })
    .eq('id', applicationId)

  await supabase.from('rental_application_status_history').insert({
    application_id: applicationId,
    actor_user_id: user.id,
    from_status: application.status,
    to_status: 'offered',
    note: message ? `Erbjudande: ${message.slice(0, 120)}` : 'Erbjudande skickat',
  })

  revalidatePath('/dashboard/listings')
  revalidatePath('/landlord/applications')
}

export async function withdrawOfferAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()

  const offerId = String(formData.get('offerId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  if (!offerId || !reason) return

  const { data: offer } = await supabase
    .from('rental_offers')
    .select('id, status, application_id')
    .eq('id', offerId)
    .maybeSingle()

  if (!offer || offer.status !== 'sent') return

  await supabase
    .from('rental_offers')
    .update({ status: 'withdrawn', withdrawn_reason: reason, responded_at: new Date().toISOString() })
    .eq('id', offerId)

  await supabase.from('rental_offer_events').insert({
    offer_id: offerId,
    actor_user_id: user.id,
    event_type: 'offer_withdrawn',
    payload: { reason },
  })

  // Move the application back to reviewing so the pipeline stays coherent.
  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, status')
    .eq('id', offer.application_id)
    .maybeSingle()

  if (application && application.status === 'offered') {
    await supabase
      .from('rental_applications')
      .update({ status: 'reviewing', status_updated_at: new Date().toISOString() })
      .eq('id', application.id)

    await supabase.from('rental_application_status_history').insert({
      application_id: application.id,
      actor_user_id: user.id,
      from_status: 'offered',
      to_status: 'reviewing',
      note: `Erbjudandet drogs tillbaka: ${reason}`,
    })
  }

  revalidatePath('/dashboard/listings')
}

/**
 * Creates a contract draft for an application whose offer was accepted.
 * The rendered body is an immutable snapshot; the template gets locked on use.
 */
export async function createContractDraftAction(formData: FormData) {
  const { supabase, user, profile } = await requireLandlordAccess()

  const applicationId = String(formData.get('applicationId') ?? '')
  const templateId = String(formData.get('templateId') ?? '')
  if (!applicationId || !templateId) return

  const [{ data: application }, { data: template }] = await Promise.all([
    supabase
      .from('rental_applications')
      .select('id, user_id, listing_id, status, applicant_full_name, listing_title, listing_city, listing_price, move_in_date, landlord_company_id')
      .eq('id', applicationId)
      .maybeSingle(),
    supabase
      .from('contract_templates')
      .select('id, name, version, body_template, is_active')
      .eq('id', templateId)
      .maybeSingle(),
  ])

  if (!application?.user_id || !template?.is_active) return

  const actor = ['admin', 'super_admin'].includes(profile.role) ? 'admin' : 'landlord'
  if (!canTransition(application.status, 'contract_pending', actor)) return

  let landlordName = 'Hyresvärden'
  if (application.landlord_company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', application.landlord_company_id)
      .maybeSingle()
    if (company) landlordName = company.name
  }

  let listingAddress = application.listing_city ?? ''
  if (application.listing_id) {
    const { data: listing } = await supabase
      .from('listings')
      .select('street, zip_code, city')
      .eq('id', application.listing_id)
      .maybeSingle()
    if (listing) listingAddress = [listing.street, listing.zip_code, listing.city].filter(Boolean).join(', ')
  }

  const body = renderContractTemplate(template.body_template, {
    landlord_name: landlordName,
    applicant_name: application.applicant_full_name,
    listing_title: application.listing_title,
    listing_address: listingAddress,
    rent: application.listing_price,
    move_in_date: application.move_in_date ?? 'Enligt överenskommelse',
  })

  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      application_id: applicationId,
      listing_id: application.listing_id,
      template_id: template.id,
      template_version: template.version,
      body_snapshot: body,
      status: 'internal_review',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !contract) {
    console.error('Failed to create contract draft', error)
    return
  }

  // Lock the template version after first use (immutability).
  await supabase
    .from('contract_templates')
    .update({ locked_at: new Date().toISOString() })
    .eq('id', template.id)
    .is('locked_at', null)

  // Signers: applicant + landlord representative (+ accepted co-applicants).
  const signers: Array<{ signer_role: 'applicant' | 'co_applicant' | 'landlord'; user_id: string | null; full_name: string; email: string | null }> = [
    { signer_role: 'applicant', user_id: application.user_id, full_name: application.applicant_full_name ?? 'Hyresgäst', email: null },
    { signer_role: 'landlord', user_id: user.id, full_name: landlordName, email: null },
  ]

  const { data: coApplicants } = await supabase
    .from('rental_application_co_applicants')
    .select('full_name, email')
    .eq('application_id', applicationId)

  for (const coApplicant of coApplicants ?? []) {
    signers.push({ signer_role: 'co_applicant', user_id: null, full_name: coApplicant.full_name, email: coApplicant.email })
  }

  await supabase.from('contract_signers').insert(signers.map((signer) => ({ ...signer, contract_id: contract.id })))

  await supabase.from('contract_events').insert({
    contract_id: contract.id,
    actor_user_id: user.id,
    event_type: 'contract_drafted',
    payload: { template_id: template.id, template_version: template.version },
  })

  // Application → contract_pending.
  await supabase
    .from('rental_applications')
    .update({ status: 'contract_pending', status_updated_at: new Date().toISOString() })
    .eq('id', applicationId)

  await supabase.from('rental_application_status_history').insert({
    application_id: applicationId,
    actor_user_id: user.id,
    from_status: application.status,
    to_status: 'contract_pending',
    note: 'Kontraktsutkast skapat',
  })

  revalidatePath('/dashboard/listings')
}

/** Sends the contract for signing via the configured e-sign provider. */
export async function sendContractForSigningAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()

  const contractId = String(formData.get('contractId') ?? '')
  if (!contractId) return

  const resolution = resolveEsignProvider()
  if (resolution.kind !== 'provider') {
    console.error('E-sign provider not configured')
    return
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status, body_snapshot, contract_signers(full_name, email, signer_role)')
    .eq('id', contractId)
    .maybeSingle()

  if (!contract || !['draft', 'internal_review'].includes(contract.status)) return

  let providerRef: string
  try {
    const created = await resolution.provider.createSigningRequest({
      contractId,
      documentText: contract.body_snapshot,
      signers: (contract.contract_signers ?? []).map((signer) => ({
        fullName: signer.full_name,
        email: signer.email,
        role: signer.signer_role as 'applicant' | 'co_applicant' | 'guarantor' | 'landlord',
      })),
    })
    providerRef = created.providerRef
  } catch (error) {
    console.error('E-sign provider request failed', error)
    return
  }

  await supabase
    .from('contracts')
    .update({ status: 'sent_for_signing', provider: resolution.provider.name, provider_ref: providerRef })
    .eq('id', contractId)

  await supabase.from('contract_events').insert({
    contract_id: contractId,
    actor_user_id: user.id,
    event_type: 'sent_for_signing',
    payload: { provider: resolution.provider.name, mock: resolution.provider.isMock },
  })

  revalidatePath('/dashboard/listings')
}

/** Mock signing (labeled) — used by dev/staging while no e-sign provider exists. */
export async function mockSignContractAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const contractId = String(formData.get('contractId') ?? '')
  if (!contractId) return

  const { error } = await supabase.rpc('mock_sign_contract', { p_contract_id: contractId })
  if (error) console.error('Mock signing failed', error)

  revalidatePath('/dashboard/listings')
  revalidatePath('/landlord/applications')
}
