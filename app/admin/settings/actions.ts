'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'
import type { Json } from '@/lib/supabase/database.types'

export async function updatePlatformSettingAction(formData: FormData) {
  const { supabase, user, role } = await requireAdminUser()
  // RLS enforces this too; checked here for a clear error path.
  if (role !== 'super_admin') redirect('/admin/settings?error=super_admin_required')

  const key = String(formData.get('key') ?? '').trim()
  const rawValue = String(formData.get('value') ?? '').trim()
  if (!key || !rawValue) return

  let value: Json
  try {
    value = JSON.parse(rawValue) as Json
  } catch {
    redirect('/admin/settings?error=invalid_json')
  }

  const { data: existing } = await supabase
    .from('platform_settings')
    .select('key, value')
    .eq('key', key)
    .maybeSingle()
  if (!existing) return

  const { error } = await supabase
    .from('platform_settings')
    .update({ value, updated_by: user.id })
    .eq('key', key)

  if (error) {
    console.error('Failed to update platform setting', error)
    redirect('/admin/settings?error=failed')
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'platform_setting_updated',
    targetType: 'platform_setting',
    targetId: key,
    metadata: { previous_value: existing.value, value },
  })

  revalidatePath('/admin/settings')
  redirect('/admin/settings?saved=1')
}
