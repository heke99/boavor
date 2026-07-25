'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantPortal } from '@/lib/tenant/portal'

export type TerminationActionState = { error?: string; success?: string }

export async function requestTermination(
  _previous: TerminationActionState,
  formData: FormData,
): Promise<TerminationActionState> {
  const { context, bundle } = await requireTenantPortal()
  const tenancyId = String(formData.get('tenancyId') ?? '')
  if (!bundle.tenancies.some((item) => item.id === tenancyId && item.status === 'active')) {
    return { error: 'Endast ett aktivt avtal kan sägas upp.' }
  }
  const { error } = await context.supabase.rpc('request_lease_termination', {
    p_tenancy_id: tenancyId,
    p_requested_end_date: String(formData.get('requestedEndDate') ?? ''),
    p_reason: String(formData.get('reason') ?? '') || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/tenant/move')
  revalidatePath('/tenant')
  return { success: 'Uppsägningen är registrerad för granskning.' }
}

