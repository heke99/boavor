import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TrackableEvent =
  | 'listing_view'
  | 'search_performed'
  | 'application_submitted'
  | 'inquiry_submitted'
  | 'saved_search_created'
  | 'exchange_interest'
  | 'registration_completed'

/**
 * Fire-and-forget analytics tracking. Never throws and never blocks the
 * response path. Only whitelisted event types are accepted by the database
 * function; metadata must not contain personal data.
 */
export async function trackEvent(
  eventType: TrackableEvent,
  params: { listingId?: string | null; metadata?: Record<string, string | number | boolean | null> } = {},
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return

    await supabase.rpc('track_analytics_event', {
      p_event_type: eventType,
      p_listing_id: params.listingId ?? undefined,
      p_metadata: params.metadata ?? {},
    })
  } catch (error) {
    console.error('Analytics tracking failed', error)
  }
}
