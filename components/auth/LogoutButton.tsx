'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type LogoutButtonProps = {
  className?: string
  label?: string
  compact?: boolean
}

export function LogoutButton({ className, label = 'Logga ut', compact = false }: LogoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    setIsLoading(true)
    const supabase = createSupabaseBrowserClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={clsx(
        'inline-flex items-center justify-center rounded-2xl border border-[#d7dbe7] bg-white font-semibold !text-[#111827] transition hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm',
        className,
      )}
    >
      <LogOut size={compact ? 15 : 16} className={compact ? 'mr-1.5' : 'mr-2'} />
      {isLoading ? 'Loggar ut...' : label}
    </button>
  )
}
