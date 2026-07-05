'use server'

import { revalidatePath } from 'next/cache'
import { requireSignedInUser } from '@/lib/data/rental-applications'
import { isActiveApplicationStatus } from '@/lib/queue/limits'

export async function withdrawApplicationAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const applicationId = String(formData.get('applicationId') ?? '')
  if (!applicationId) return

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, status, listing_title')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!application) return
  // Only active applications can be withdrawn.
  if (!isActiveApplicationStatus(application.status)) return

  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'withdrawn', status_updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to withdraw application', error)
    return
  }

  await supabase.from('rental_application_status_history').insert({
    application_id: applicationId,
    actor_user_id: user.id,
    from_status: application.status,
    to_status: 'withdrawn',
    note: 'Återkallad av den sökande',
  })

  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Ansökan återkallad',
    body: `Din ansökan för ${application.listing_title ?? 'bostaden'} har återkallats.`,
  })

  revalidatePath('/dashboard/applications')
  revalidatePath('/dashboard')
}
