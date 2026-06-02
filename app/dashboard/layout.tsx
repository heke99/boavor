import { requireDashboardAccess } from '@/lib/auth/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess()
  return children
}
