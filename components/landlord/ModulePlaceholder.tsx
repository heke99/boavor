import { Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * Honest module state for landlord workspace sections that are being rolled
 * out batch by batch. Never fakes functionality.
 */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef3c7] text-[#b45309]">
        <Hourglass size={22} />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-[#111827]">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#6b7280]">{description}</p>
    </Card>
  )
}
