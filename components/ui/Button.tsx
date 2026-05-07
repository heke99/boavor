import Link from 'next/link'
import { forwardRef } from 'react'
import clsx from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

const baseStyles =
  'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5b3df5]/30 disabled:cursor-not-allowed disabled:opacity-60'

const variants = {
  primary:
    'bg-[#5b3df5] text-white hover:bg-[#4c31d8] shadow-[0_16px_40px_rgba(91,61,245,0.28)]',
  secondary:
    'bg-[#111827] text-white hover:bg-[#0b1220] shadow-[0_16px_40px_rgba(17,24,39,0.18)]',
  ghost:
    'border border-[#d7dbe7] bg-white text-[#111827] hover:bg-[#f7f8fc]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', href, children, ...props },
  ref,
) {
  const styles = clsx(baseStyles, variants[variant], className)

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    )
  }

  return (
    <button ref={ref} className={styles} {...props}>
      {children}
    </button>
  )
})