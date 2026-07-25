import { requireTenantPortal } from '@/lib/tenant/portal'

export const dynamic = 'force-dynamic'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  await requireTenantPortal()
  return <>{children}</>
}

