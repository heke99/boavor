import { requireAdminUser } from '@/lib/data/admin'

export type AdminIdentityRow = {
  id: string
  userId: string
  provider: string
  status: string
  ageVerified: boolean | null
  failureReason: string | null
  createdAt: string
  verifiedAt: string | null
}

export type AdminRiskFlagRow = {
  id: string
  userId: string
  flagType: string
  severity: string
  note: string | null
  createdAt: string
  resolvedAt: string | null
}

export async function getAdminIdentityOverview(): Promise<AdminIdentityRow[]> {
  const { supabase } = await requireAdminUser()

  const { data, error } = await supabase.rpc('admin_identity_overview')
  if (error) {
    console.error('Failed to fetch identity overview', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    status: row.status,
    ageVerified: row.age_verified,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  }))
}

export async function getAdminRiskFlags(): Promise<AdminRiskFlagRow[]> {
  const { supabase } = await requireAdminUser()

  const { data, error } = await supabase
    .from('user_risk_flags')
    .select('id, user_id, flag_type, severity, note, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Failed to fetch risk flags', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    flagType: row.flag_type,
    severity: row.severity,
    note: row.note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }))
}
