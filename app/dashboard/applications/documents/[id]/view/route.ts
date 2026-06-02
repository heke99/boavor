import { NextResponse } from 'next/server'
import { canManageApplication, getAuthContext } from '@/lib/auth/permissions'
import { parseStorageUri } from '@/lib/storage'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const { supabase, user, profile } = await getAuthContext()

  const { data: document } = await supabase
    .from('rental_application_documents')
    .select('id, application_id, user_id, file_url')
    .eq('id', id)
    .maybeSingle<{ id: string; application_id: string; user_id: string; file_url: string }>()

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (document.user_id !== user.id) {
    const { data: application } = await supabase
      .from('rental_applications')
      .select('id, landlord_user_id, landlord_company_id')
      .eq('id', document.application_id)
      .maybeSingle<{ id: string; landlord_user_id: string | null; landlord_company_id: string | null }>()

    if (!canManageApplication(profile, application)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
  }

  const storageRef = parseStorageUri(document.file_url)
  if (!storageRef) {
    return NextResponse.redirect(document.file_url)
  }

  const { data, error } = await supabase.storage.from(storageRef.bucket).createSignedUrl(storageRef.path, 60)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not create signed document URL' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
