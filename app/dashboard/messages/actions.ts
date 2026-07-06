'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  MESSAGE_ATTACHMENTS_BUCKET,
  sanitizeStorageFileName,
  toStorageUri,
  validateMessageAttachment,
} from '@/lib/storage'
import { scanForVirus } from '@/lib/messaging/attachment-scan'

/** Landlord starts (or reuses) the thread for an application. */
export async function startApplicationThreadAction(formData: FormData) {
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/landlord/messages' })

  const applicationId = String(formData.get('applicationId') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!applicationId || !body) return

  const { data: threadId, error } = await supabase.rpc('create_application_thread', {
    p_application_id: applicationId,
    p_subject: subject,
    p_body: body,
  })

  if (error || !threadId) {
    console.error('Failed to start application thread', error)
    return
  }

  revalidatePath('/landlord/messages')
  redirect(`/landlord/messages?thread=${threadId}`)
}

export async function sendMessageAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/messages' })

  const threadId = String(formData.get('threadId') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  const backTo = String(formData.get('backTo') ?? '/dashboard/messages')
  if (!threadId || !body) return

  const allowed = await checkRateLimit(supabase, {
    scope: 'message_send',
    subject: user.id,
    limit: 60,
    windowSeconds: 60 * 60,
  })
  if (!allowed) return

  // RLS enforces participant + lock rules; this insert fails silently for
  // non-participants or locked threads.
  const { data: message, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_user_id: user.id, body })
    .select('id')
    .single()

  if (error || !message) {
    console.error('Failed to send message', error)
    return
  }

  // Optional attachment.
  const file = formData.get('attachment')
  if (file instanceof File && file.size > 0) {
    const validationError = validateMessageAttachment(file)
    if (!validationError) {
      const scan = await scanForVirus(file)
      if (scan.status !== 'infected') {
        const safeName = sanitizeStorageFileName(file.name)
        const path = `${user.id}/${randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from(MESSAGE_ATTACHMENTS_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false })

        if (!uploadError) {
          await supabase.from('message_attachments').insert({
            message_id: message.id,
            file_name: file.name,
            file_url: toStorageUri(MESSAGE_ATTACHMENTS_BUCKET, path),
            content_type: file.type,
            size_bytes: file.size,
          })
        } else {
          console.error('Attachment upload failed', uploadError)
        }
      }
    } else {
      console.error('Attachment rejected:', validationError)
    }
  }

  revalidatePath(backTo)
  redirect(`${backTo}?thread=${threadId}`)
}

export async function markThreadReadAction(threadId: string) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login' })
  if (!threadId) return

  await supabase
    .from('message_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
}

export async function setThreadDeadlineAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/landlord/messages' })

  const threadId = String(formData.get('threadId') ?? '')
  const deadline = String(formData.get('deadline') ?? '').trim()
  if (!threadId) return

  // RLS restricts updates to landlord/support participants.
  const { error } = await supabase
    .from('message_threads')
    .update({ response_deadline_at: deadline ? new Date(deadline).toISOString() : null })
    .eq('id', threadId)

  if (!error) {
    await supabase.from('message_events').insert({
      thread_id: threadId,
      actor_user_id: user.id,
      event_type: deadline ? 'deadline_set' : 'deadline_cleared',
      payload: { deadline: deadline || null },
    })
  }

  revalidatePath('/landlord/messages')
}

export async function setThreadLockAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/landlord/messages' })

  const threadId = String(formData.get('threadId') ?? '')
  const lock = String(formData.get('lock') ?? '') === 'true'
  if (!threadId) return

  const { error } = await supabase
    .from('message_threads')
    .update({
      locked_at: lock ? new Date().toISOString() : null,
      locked_by: lock ? user.id : null,
    })
    .eq('id', threadId)

  if (!error) {
    await supabase.from('message_events').insert({
      thread_id: threadId,
      actor_user_id: user.id,
      event_type: lock ? 'thread_locked' : 'thread_unlocked',
    })
  }

  revalidatePath('/landlord/messages')
}
