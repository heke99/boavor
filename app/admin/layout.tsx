import { requireAdminAccess } from '@/lib/auth/permissions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess()
  return children
}
