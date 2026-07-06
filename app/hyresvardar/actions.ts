'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { calculateRoi, type RoiInput } from '@/lib/sales/roi'

export type LeadSubmissionResult = { ok: true } | { ok: false; error: string }

export async function submitSalesLeadAction(input: {
  companyName: string
  contactName: string
  email: string
  phone?: string
  city?: string
  unitsCount?: number
  message?: string
  source: 'roi_calculator' | 'demo_request' | 'contact_form'
  roiInput?: RoiInput
}): Promise<LeadSubmissionResult> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false, error: 'Tjänsten är inte tillgänglig just nu.' }

  const companyName = input.companyName?.trim() ?? ''
  const contactName = input.contactName?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''

  if (!companyName || !contactName || !email.includes('@')) {
    return { ok: false, error: 'Fyll i företag, namn och en giltig e-postadress.' }
  }

  const allowed = await checkRateLimit(supabase, {
    scope: 'sales_lead',
    subject: email,
    limit: 3,
    windowSeconds: 60 * 60,
  })
  if (!allowed) return { ok: false, error: 'För många förfrågningar. Försök igen om en stund.' }

  const roiSnapshot = input.roiInput
    ? { input: input.roiInput, result: calculateRoi(input.roiInput) }
    : null

  const { error } = await supabase.from('sales_leads').insert({
    company_name: companyName.slice(0, 160),
    contact_name: contactName.slice(0, 120),
    email: email.slice(0, 200),
    phone: input.phone?.trim().slice(0, 40) || null,
    city: input.city?.trim().slice(0, 80) || null,
    units_count: Number.isFinite(input.unitsCount) ? Math.max(0, Math.floor(input.unitsCount as number)) : null,
    message: input.message?.trim().slice(0, 2000) || null,
    source: input.source,
    roi_snapshot: roiSnapshot ? JSON.parse(JSON.stringify(roiSnapshot)) : null,
  })

  if (error) {
    console.error('Failed to create sales lead', error)
    return { ok: false, error: 'Något gick fel. Försök igen eller mejla oss direkt.' }
  }

  return { ok: true }
}
