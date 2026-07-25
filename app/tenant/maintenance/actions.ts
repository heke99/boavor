'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantPortal } from '@/lib/tenant/portal'

export type MaintenanceActionState = { error?: string; success?: string }

export async function createMaintenanceCase(
  _previous: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const { context, bundle } = await requireTenantPortal()
  const tenancyId = String(formData.get('tenancyId') ?? '')
  if (!bundle.tenancies.some((item) => item.id === tenancyId)) return { error: 'Ogiltigt hyresavtal.' }

  const { error } = await context.supabase.rpc('create_maintenance_case', {
    p_tenancy_id: tenancyId,
    p_category: String(formData.get('category') ?? ''),
    p_urgency: String(formData.get('urgency') ?? 'normal'),
    p_title: String(formData.get('title') ?? ''),
    p_description: String(formData.get('description') ?? ''),
    p_access_instructions: String(formData.get('accessInstructions') ?? '') || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/tenant/maintenance')
  revalidatePath('/tenant')
  return { success: 'Felanmälan är registrerad.' }
}

