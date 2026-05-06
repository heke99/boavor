import { cn } from '@/lib/utils'

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-[28px] border border-black/8 bg-white shadow-[0_10px_40px_rgba(13,17,32,0.06)]', className)}>
      {children}
    </div>
  )
}
