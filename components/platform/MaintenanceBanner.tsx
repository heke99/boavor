import { Wrench } from 'lucide-react'
import { getMaintenanceMode } from '@/lib/platform/maintenance'

/** Site-wide banner while maintenance mode is enabled (platform setting). */
export async function MaintenanceBanner() {
  const maintenance = await getMaintenanceMode()
  if (!maintenance.enabled) return null

  return (
    <div className="border-b border-[#fde68a] bg-[#fffbeb]">
      <div className="container-shell flex items-center gap-3 py-3 text-sm font-semibold text-[#92400e]">
        <Wrench size={16} className="shrink-0" />
        {maintenance.message || 'Bovaro underhålls just nu. Vissa funktioner kan vara tillfälligt begränsade.'}
      </div>
    </div>
  )
}
