import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'light'
}

const base =
  'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none'
const variants = {
  primary: 'bg-[var(--primary)] text-white shadow-[0_16px_40px_rgba(91,61,245,0.35)] hover:bg-[var(--primary-strong)]',
  secondary: 'bg-[var(--secondary-soft)] text-[var(--secondary)] hover:opacity-90',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-black/5',
  light: 'bg-white text-[var(--foreground)] hover:bg-white/90',
}

export function Button({ className, href, variant = 'primary', ...props }: ButtonProps) {
  if (href) {
    return (
      <Link href={href} className={cn(base, variants[variant], className)}>
        {props.children}
      </Link>
    )
  }

  return <button className={cn(base, variants[variant], className)} {...props} />
}
