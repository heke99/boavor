import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/permissions'
import type { Json } from '@/lib/supabase/database.types'

export type PortalTenancy = {
  id: string
  number: string
  status: string
  starts_on: string
  ends_on: string | null
  unit_id: string | null
  company_id: string
  contract_id: string
}

export type PortalInvoice = {
  id: string
  number: string
  status: string
  issue_date: string
  due_date: string
  total_ore: number
  paid_ore: number
  outstanding_ore: number
  tenancy_id: string
}

export type PortalMaintenanceCase = {
  id: string
  number: string
  title: string
  urgency: string
  status: string
  created_at: string
  tenancy_id: string
}

export type PortalTermination = {
  id: string
  number: string
  status: string
  requested_end_date: string
  contractual_end_date: string | null
  tenancy_id: string
}

export type TenantPortalBundle = {
  tenancies: PortalTenancy[]
  invoices: PortalInvoice[]
  maintenance: PortalMaintenanceCase[]
  terminations: PortalTermination[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function parseTenantPortalBundle(value: Json | null): TenantPortalBundle {
  if (!isRecord(value)) {
    return { tenancies: [], invoices: [], maintenance: [], terminations: [] }
  }

  return {
    tenancies: parseArray<PortalTenancy>(value.tenancies),
    invoices: parseArray<PortalInvoice>(value.invoices),
    maintenance: parseArray<PortalMaintenanceCase>(value.maintenance),
    terminations: parseArray<PortalTermination>(value.terminations),
  }
}

export async function requireTenantPortal() {
  const context = await requireDashboardAccess()
  const { data, error } = await context.supabase.rpc('get_tenant_portal_bundle')

  if (error) {
    console.error('Failed to load tenant portal', { message: error.message })
    throw new Error('Hyresgästportalen kunde inte laddas.')
  }

  const bundle = parseTenantPortalBundle(data)
  if (bundle.tenancies.length === 0) redirect('/dashboard?tenant=not-active')
  return { context, bundle }
}

export function formatMoney(amountOre: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 2,
  }).format(amountOre / 100)
}

