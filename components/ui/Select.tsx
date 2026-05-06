import { cn } from '@/lib/utils'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
