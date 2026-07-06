import { requireDashboardAccess } from '@/lib/auth/permissions'
import { LegalReacceptanceBanner } from '@/components/legal/LegalReacceptanceBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess()
  return (
    <>
      <LegalReacceptanceBanner />
      {children}
    </>
  )
}
