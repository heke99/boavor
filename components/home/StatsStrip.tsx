import { stats } from '@/lib/mock-data'

export function StatsStrip() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((item) => (
        <div key={item.label} className="rounded-[28px] border border-white/10 bg-white/6 p-5 text-white backdrop-blur-sm">
          <div className="text-3xl font-semibold">{item.value}</div>
          <div className="mt-2 text-sm text-white/72">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
