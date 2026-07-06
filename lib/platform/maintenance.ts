import { createSupabaseServerClient } from '@/lib/supabase/server'

export type MaintenanceMode = {
  enabled: boolean
  message: string
}

/**
 * Reads the public maintenance_mode platform setting. Fail-soft: any error
 * means "not in maintenance" so a broken settings read can never take the
 * site down by accident.
 */
export async function getMaintenanceMode(): Promise<MaintenanceMode> {
  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return { enabled: false, message: '' }

    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    const value = data?.value as { enabled?: boolean; message?: string } | null
    return {
      enabled: value?.enabled === true,
      message: typeof value?.message === 'string' ? value.message : '',
    }
  } catch {
    return { enabled: false, message: '' }
  }
}
