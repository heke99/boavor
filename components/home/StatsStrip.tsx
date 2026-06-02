import { getStats } from '@/lib/data/market'

export async function StatsStrip() {
  const stats = await getStats()

  if (!stats.length) return null

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((item, index) => (
        <div
          key={item.label}
          className="group rounded-[30px] border border-white/14 bg-white/[0.08] p-5 text-white shadow-[0_18px_55px_rgba(0,0,0,0.16)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.12]"
        >
          <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-white via-[#93c5fd] to-[#5eead4] opacity-80 transition group-hover:w-16" />
          <div className="text-3xl font-semibold tracking-[-0.03em]">{item.value}</div>
          <div className="mt-2 text-sm text-white/72">{item.label}</div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
            0{index + 1}
          </div>
        </div>
      ))}
    </div>
  )
}
