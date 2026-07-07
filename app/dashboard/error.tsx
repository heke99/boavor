'use client'

import { SegmentErrorFallback } from '@/components/layout/SegmentErrorFallback'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorFallback error={error} reset={reset} title="Översikten kunde inte laddas" />
}
