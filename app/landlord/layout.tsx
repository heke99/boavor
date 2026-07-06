import { requireLandlordAccess } from '@/lib/data/landlord'

export const dynamic = 'force-dynamic'

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  // Server-side access guard: seekers are redirected to /dashboard.
  await requireLandlordAccess()
  return <>{children}</>
}
