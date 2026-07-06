import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { pendingReacceptances } from '@/lib/legal/versions'
import { acceptLegalDocumentsAction } from '@/app/actions/legal'

/**
 * Shown to signed-in users who have not accepted the current version of the
 * mandatory legal documents (after a version bump). Accepting records one
 * legal_acceptances row per document+version.
 */
export async function LegalReacceptanceBanner() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: acceptances } = await supabase
    .from('legal_acceptances')
    .select('document_type, document_version')
    .eq('user_id', user.id)

  const pending = pendingReacceptances(acceptances ?? [])
  if (pending.length === 0) return null

  return (
    <div className="container-shell pt-6">
      <div className="rounded-[28px] border border-[#fde68a] bg-[#fffbeb] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fef3c7] text-[#b45309]">
              <ScrollText size={18} />
            </div>
            <div>
              <div className="font-semibold text-[#111827]">Uppdaterade villkor</div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#78350f]">
                Vi har uppdaterat{' '}
                {pending.map((document, index) => (
                  <span key={document.type}>
                    {index > 0 ? (index === pending.length - 1 ? ' och ' : ', ') : ''}
                    <Link href={document.path} className="font-semibold underline underline-offset-4">
                      {document.title.toLowerCase()}
                    </Link>
                    {` (version ${document.version})`}
                  </span>
                ))}
                . Läs igenom och godkänn för att fortsätta använda ditt konto fullt ut.
              </p>
            </div>
          </div>
          <form action={acceptLegalDocumentsAction}>
            {pending.map((document) => (
              <input key={document.type} type="hidden" name="documentTypes" value={document.type} />
            ))}
            <button
              type="submit"
              className="inline-flex items-center rounded-2xl bg-[#111827] px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#0b1220]"
            >
              Jag godkänner
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
