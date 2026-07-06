import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseStorageUri } from '@/lib/storage'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.redirect(new URL('/login', request.url))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: document } = await supabase
    .from('profile_documents')
    .select('id, user_id, file_url')
    .eq('id', id)
    .maybeSingle<{ id: string; user_id: string; file_url: string }>()

  if (!document || document.user_id !== user.id) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const storageRef = parseStorageUri(document.file_url)
  if (!storageRef) {
    return NextResponse.redirect(document.file_url)
  }

  const { data, error } = await supabase.storage.from(storageRef.bucket).createSignedUrl(storageRef.path, 60)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not create signed document URL' }, { status: 500 })
  }

  await supabase.from('document_access_logs').insert({
    document_id: document.id,
    actor_user_id: user.id,
    owner_user_id: document.user_id,
    access_type: 'profile_document',
    metadata: { route: 'dashboard_document_view' },
  })

  return NextResponse.redirect(data.signedUrl)
}
