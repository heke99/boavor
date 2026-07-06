import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseStorageUri } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * Signed-URL redirect for message attachments. RLS ensures only thread
 * participants can resolve the attachment row; every open is audited in
 * message_events.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: attachment } = await supabase
    .from('message_attachments')
    .select('id, file_url, messages(thread_id)')
    .eq('id', id)
    .maybeSingle()

  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const storageRef = parseStorageUri(attachment.file_url)
  if (!storageRef) return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 })

  const { data: signed, error } = await supabase.storage
    .from(storageRef.bucket)
    .createSignedUrl(storageRef.path, 60)

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not create signed URL' }, { status: 500 })
  }

  const threadId = (attachment.messages as { thread_id: string } | null)?.thread_id
  if (threadId) {
    await supabase.from('message_events').insert({
      thread_id: threadId,
      actor_user_id: user.id,
      event_type: 'attachment_opened',
      payload: { attachment_id: attachment.id },
    })
  }

  return NextResponse.redirect(signed.signedUrl)
}
