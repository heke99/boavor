import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { deleteHelpArticleAction, saveHelpArticleAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const categoryLabels: Record<string, string> = {
  allmant: 'Allmänt',
  sokande: 'För bostadssökande',
  hyresvard: 'För hyresvärdar',
  byta: 'Bovaro Byta',
  betalning: 'Betalning och Plus',
  integritet: 'Integritet och GDPR',
}

const errorMessages: Record<string, string> = {
  fields_required: 'Fyll i titel och innehåll.',
  slug_invalid: 'Slug måste vara små bokstäver, siffror och bindestreck.',
  slug_taken: 'En artikel med den adressen finns redan.',
  failed: 'Artikeln kunde inte sparas.',
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminHelpArticlesPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const editId = typeof params.edit === 'string' ? params.edit : null
  const saved = params.saved === '1'
  const { supabase } = await requireAdminUser()

  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, slug, title, body, category, is_published, sort_order, updated_at')
    .order('category')
    .order('sort_order')

  const editing = editId ? (articles ?? []).find((article) => article.id === editId) ?? null : null

  return (
    <AdminShell
      activePath="/admin/help-articles"
      title="Hjälpcenter"
      description="Skriv och publicera artiklar som visas publikt på /support. Innehållet är ren text med styckebrytningar."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}
      {saved ? (
        <Card className="border border-[#a7f3d0] bg-[#ecfdf5] p-5 text-sm font-semibold text-[#047857]">Artikeln har sparats.</Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">{editing ? `Redigera: ${editing.title}` : 'Ny artikel'}</h2>
        <form action={saveHelpArticleAction} className="mt-5 grid gap-4">
          {editing ? <input type="hidden" name="articleId" value={editing.id} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Titel *</span>
              <input name="title" required maxLength={140} defaultValue={editing?.title ?? ''} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Slug</span>
              <input name="slug" maxLength={80} defaultValue={editing?.slug ?? ''} className={inputClass} placeholder="genereras från titeln" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Kategori</span>
              <select name="category" defaultValue={editing?.category ?? 'allmant'} className={inputClass}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Sortering</span>
              <input name="sortOrder" type="number" defaultValue={editing?.sort_order ?? 100} className={inputClass} />
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-[#111827]">
              <input type="checkbox" name="isPublished" defaultChecked={editing?.is_published ?? false} className="h-4 w-4 rounded border-[#d1d5db]" />
              Publicerad
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Innehåll *</span>
            <textarea name="body" required rows={10} maxLength={20000} defaultValue={editing?.body ?? ''} className={`${inputClass} leading-7`} />
          </label>
          <div className="flex gap-3">
            <Button type="submit">{editing ? 'Spara ändringar' : 'Skapa artikel'}</Button>
            {editing ? (
              <Button href="/admin/help-articles" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
                Avbryt
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Artiklar</h2>
        {!articles?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga artiklar ännu.</p>
        ) : (
          <div className="mt-5 space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#111827]">{article.title}</span>
                    <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                      {categoryLabels[article.category] ?? article.category}
                    </span>
                    <span
                      className={
                        article.is_published
                          ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                          : 'rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]'
                      }
                    >
                      {article.is_published ? 'Publicerad' : 'Utkast'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#6b7280]">/support/artiklar/{article.slug}</div>
                </div>
                <div className="flex gap-2">
                  {article.is_published ? (
                    <Link
                      href={`/support/artiklar/${article.slug}`}
                      className="inline-flex h-8 items-center rounded-xl border border-[#d7dbe7] bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-[#f7f8fc]"
                    >
                      Visa
                    </Link>
                  ) : null}
                  <Link
                    href={`/admin/help-articles?edit=${article.id}`}
                    className="inline-flex h-8 items-center rounded-xl border border-[#d7dbe7] bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-[#f7f8fc]"
                  >
                    Redigera
                  </Link>
                  <form action={deleteHelpArticleAction}>
                    <input type="hidden" name="articleId" value={article.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-3 text-xs !text-[#b91c1c]">Ta bort</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
