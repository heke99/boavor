'use client'

import { Button } from '@/components/ui/Button'

/**
 * Shared error boundary content for the dashboard/landlord/admin segments so
 * a failing page never blanks the whole app shell.
 */
export function SegmentErrorFallback({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}) {
  return (
    <section className="container-shell py-12">
      <div className="rounded-[32px] border border-[#fecaca] bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-[#fef2f2] px-3 py-1 text-xs font-semibold text-[#b91c1c]">
          Något gick fel
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-[#111827]">{title ?? 'Sidan kunde inte laddas'}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
          Försök igen. Om problemet kvarstår kan supporten använda felkoden {error.digest ?? 'saknas'}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>Försök igen</Button>
          <Button href="/support" variant="ghost">Kontakta support</Button>
        </div>
      </div>
    </section>
  )
}
