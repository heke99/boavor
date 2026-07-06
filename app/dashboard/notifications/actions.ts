'use server'

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth/permissions'

export async function markNotificationReadAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/notifications' })
  const notificationId = String(formData.get('notificationId') ?? '')
  if (!notificationId) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/notifications')
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/notifications' })

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  revalidatePath('/dashboard/notifications')
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/settings' })

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      email_applications: formData.get('emailApplications') === 'on',
      email_messages: formData.get('emailMessages') === 'on',
      email_queue: formData.get('emailQueue') === 'on',
      email_saved_searches: formData.get('emailSavedSearches') === 'on',
      email_byta: formData.get('emailByta') === 'on',
      email_marketing: formData.get('emailMarketing') === 'on',
      weekly_digest: formData.get('weeklyDigest') === 'on',
    },
    { onConflict: 'user_id' },
  )

  if (error) console.error('Failed to update notification preferences', error)

  revalidatePath('/dashboard/settings')
}
