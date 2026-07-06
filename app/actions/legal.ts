'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLegalDocument, type LegalDocumentType } from '@/lib/legal/versions'

const ACCEPTABLE_TYPES: LegalDocumentType[] = ['terms', 'privacy', 'cookies', 'advertiser_terms']

/** Records acceptance of the CURRENT version of the given documents. */
export async function acceptLegalDocumentsAction(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const requested = formData
    .getAll('documentTypes')
    .map(String)
    .filter((type): type is LegalDocumentType => ACCEPTABLE_TYPES.includes(type as LegalDocumentType))

  if (requested.length === 0) return

  const rows = requested.map((type) => {
    const document = getLegalDocument(type)
    return {
      user_id: user.id,
      document_type: document.type,
      document_version: document.version,
      metadata: { source: 'reacceptance_banner' },
    }
  })

  const { error } = await supabase
    .from('legal_acceptances')
    .upsert(rows, { onConflict: 'user_id,document_type,document_version', ignoreDuplicates: true })

  if (error) {
    console.error('Failed to record legal acceptance', error)
    return
  }

  revalidatePath('/dashboard')
}
