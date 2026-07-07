'use client'

import { SegmentErrorFallback } from '@/components/layout/SegmentErrorFallback'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorFallback error={error} reset={reset} title="Adminvyn kunde inte laddas" />
}
