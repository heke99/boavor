import type { Json } from '@/lib/supabase/database.types'
import { requireLandlordAccess } from '@/lib/data/landlord'

export type LandlordLifecycleBundle = {
  tenancies: number
  move_ins: number
  unpaid_invoices: number
  outstanding_ore: number
  maintenance: number
  urgent_maintenance: number
  move_outs: number
  dead_letters: number
}

const EMPTY: LandlordLifecycleBundle = {
  tenancies: 0,
  move_ins: 0,
  unpaid_invoices: 0,
  outstanding_ore: 0,
  maintenance: 0,
  urgent_maintenance: 0,
  move_outs: 0,
  dead_letters: 0,
}

export function parseLifecycleBundle(value: Json | null): LandlordLifecycleBundle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY
  const row = value as Record<string, Json | undefined>
  return Object.fromEntries(
    Object.keys(EMPTY).map((key) => [key, typeof row[key] === 'number' ? row[key] : 0]),
  ) as LandlordLifecycleBundle
}

export async function getLandlordLifecycleBundle() {
  const context = await requireLandlordAccess()
  if (!context.primaryCompanyId) return { context, data: EMPTY }
  const { data, error } = await context.supabase.rpc('get_landlord_lifecycle_bundle', {
    p_company_id: context.primaryCompanyId,
  })
  if (error) {
    console.error('Failed to load landlord lifecycle bundle', { message: error.message })
    throw new Error('Livscykelöversikten kunde inte laddas.')
  }
  return { context, data: parseLifecycleBundle(data) }
}

