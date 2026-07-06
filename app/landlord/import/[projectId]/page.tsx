import { notFound } from 'next/navigation'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { FIELD_LABELS, parseCsv, type MigrationField } from '@/lib/import/migration-csv'
import { rollbackImportAction, runDryRunAction, runImportAction, updateMappingAction } from '../actions'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const statusLabels: Record<string, string> = {
  draft: 'Utkast — mappa kolumner och testkör',
  dry_run: 'Testkörd — granska resultatet och importera',
  imported: 'Importerad',
  rolled_back: 'Återställd',
}

const itemStatusLabels: Record<string, string> = {
  pending: 'Väntar',
  valid: 'Giltig',
  imported: 'Importerad',
  skipped: 'Hoppad över',
  error: 'Fel',
  rolled_back: 'Återställd',
}

export default async function MigrationProjectPage({ params, searchParams }: Props) {
  const [{ projectId }, sp] = await Promise.all([params, searchParams])
  const { supabase } = await requireLandlordAccess()

  const { data: project } = await supabase
    .from('migration_projects')
    .select('id, name, source_label, status, raw_csv, headers, mapping, created_at')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) notFound()

  const [{ data: runs }, { data: items }] = await Promise.all([
    supabase
      .from('migration_runs')
      .select('id, run_type, status, stats, created_at, finished_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('migration_items')
      .select('id, row_number, entity_type, status, error')
      .eq('project_id', projectId)
      .order('row_number')
      .limit(300),
  ])

  const headers = (project.headers as string[]) ?? []
  const mapping = (project.mapping as Record<string, MigrationField>) ?? {}
  const parsed = parseCsv(project.raw_csv)
  const previewRows = 'error' in parsed ? [] : parsed.rows.slice(0, 5)
  const canEdit = project.status === 'draft' || project.status === 'dry_run'
  const errorItems = (items ?? []).filter((item) => item.status === 'error')

  const banner =
    sp.imported === '1'
      ? { tone: 'success', text: 'Importen är klar. Fastigheter och lägenheter finns nu i din arbetsyta.' }
      : sp.dryrun === '1'
        ? { tone: 'info', text: 'Testkörningen är klar. Granska resultatet nedan innan du importerar.' }
        : sp.rolledback === '1'
          ? { tone: 'info', text: 'Importen har återställts.' }
          : sp.error === 'dry_run_required'
            ? { tone: 'error', text: 'Kör en testkörning innan du importerar.' }
            : null

  return (
    <LandlordShell
      activePath="/landlord/import"
      title={project.name}
      description={`${project.source_label ?? 'Okänt källsystem'} · ${statusLabels[project.status] ?? project.status}`}
    >
      {banner ? (
        <Card
          className={
            banner.tone === 'success'
              ? 'border border-[#a7f3d0] bg-[#ecfdf5] p-5 text-sm font-semibold text-[#047857]'
              : banner.tone === 'error'
                ? 'border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]'
                : 'border border-[#bfdbfe] bg-[#eff6ff] p-5 text-sm font-semibold text-[#1d4ed8]'
          }
        >
          {banner.text}
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">1. Kolumnmappning</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Koppla varje kolumn i din fil till rätt fält. Fastighet och lägenhetsnummer är obligatoriska.
        </p>
        <form action={updateMappingAction} className="mt-5 space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {headers.map((header) => (
              <label key={header} className="block rounded-2xl border border-[#e8ebf3] p-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{header}</span>
                <select
                  name={`map:${header}`}
                  defaultValue={mapping[header] ?? 'ignore'}
                  disabled={!canEdit}
                  className="mt-2 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827]"
                >
                  {(Object.keys(FIELD_LABELS) as MigrationField[]).map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {canEdit ? (
            <Button type="submit" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
              Spara mappning
            </Button>
          ) : null}
        </form>

        {previewRows.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f8fc] uppercase tracking-[0.1em] text-[#6b7280]">
                <tr>{headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3] font-mono">
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((_, columnIndex) => (
                      <td key={columnIndex} className="px-3 py-2 text-[#374151]">{row[columnIndex] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">2. Testkör och importera</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Testkörningen validerar alla rader utan att skriva något. Importen skapar fastigheter och lägenheter och kan
          återställas i sin helhet så länge inget har hunnit kopplas till annonser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {canEdit ? (
            <form action={runDryRunAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" variant="secondary">Kör testimport</Button>
            </form>
          ) : null}
          {project.status === 'dry_run' && errorItems.length === 0 ? (
            <form action={runImportAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit">Importera på riktigt</Button>
            </form>
          ) : null}
          {project.status === 'imported' ? (
            <form action={rollbackImportAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" variant="ghost" className="border border-[#fecaca] !text-[#b91c1c]">
                Återställ importen
              </Button>
            </form>
          ) : null}
        </div>

        {runs?.length ? (
          <div className="mt-6 space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8ebf3] p-3 text-sm">
                <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                  {run.run_type === 'dry_run' ? 'Testkörning' : run.run_type === 'import' ? 'Import' : 'Återställning'}
                </span>
                <span className="text-[#6b7280]">{new Date(run.created_at).toLocaleString('sv-SE')}</span>
                <span className="font-mono text-xs text-[#374151]">{JSON.stringify(run.stats)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {items?.length ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Rader ({items.length} visas)</h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3">Rad</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-[#6b7280]">{item.row_number}</td>
                    <td className="px-4 py-2 text-[#6b7280]">{item.entity_type === 'property' ? 'Fastighet' : 'Lägenhet'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          item.status === 'error'
                            ? 'rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]'
                            : item.status === 'imported'
                              ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                              : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]'
                        }
                      >
                        {itemStatusLabels[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[#6b7280]">{item.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </LandlordShell>
  )
}
