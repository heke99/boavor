'use client'

import { SegmentErrorFallback } from '@/components/layout/SegmentErrorFallback'

export default function LandlordError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorFallback error={error} reset={reset} title="Hyresvärdsvyn kunde inte laddas" />
}
