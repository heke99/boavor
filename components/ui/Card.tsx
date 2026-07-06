import { cn } from '@/lib/utils'

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[30px] border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.025] backdrop-blur-xl transition duration-300',
        className,
      )}
    >
      {children}
    </div>
  )
}
