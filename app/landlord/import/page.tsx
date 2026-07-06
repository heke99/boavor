import Link from 'next/link'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { createMigrationProjectAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const statusLabels: Record<string, string> = {
  draft: 'Utkast',
  dry_run: 'Testkörd',
  imported: 'Importerad',
  rolled_back: 'Återställd',
}

const errorMessages: Record<string, string> = {
  name_required: 'Ge projektet ett namn.',
  csv_required: 'Klistra in eller ladda upp en CSV-fil.',
  parse: 'Filen kunde inte tolkas.',
  pii: 'Filen innehåller kolumner som ser ut att vara personuppgifter om hyresgäster. Ta bort dem och försök igen. Flaggade kolumner:',
  failed: 'Projektet kunde inte skapas. Försök igen.',
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function LandlordImportPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const errorDetail = typeof params.detail === 'string' ? params.detail : null
  const { supabase } = await requireLandlordAccess()

  const { data: projects } = await supabase
    .from('migration_projects')
    .select('id, name, source_label, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <LandlordShell
      activePath="/landlord/import"
      title="Importcenter"
      description="Flytta in ditt bestånd från andra system: ladda upp CSV, mappa kolumner, testkör och importera fastigheter och lägenheter. Import av hyresgästers personuppgifter är blockerad."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
          {errorDetail ? <span className="mt-1 block font-normal">{errorDetail}</span> : null}
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Nytt importprojekt</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Format: en rad per lägenhet med kolumner som Fastighet, Adress, Stad, Lägenhetsnummer, Rum, Kvm, Hyra
          (svenska eller engelska rubriker; komma eller semikolon). Max 2&nbsp;000 rader.
        </p>
        <form action={createMigrationProjectAction} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Projektnamn *</span>
              <input name="name" required maxLength={120} className={inputClass} placeholder="T.ex. Flytt från Vitec 2026" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Källsystem</span>
              <input name="sourceLabel" maxLength={120} className={inputClass} placeholder="T.ex. Vitec, Momentum, Excel" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">CSV-fil</span>
            <input name="file" type="file" accept=".csv,text/csv" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">…eller klistra in CSV</span>
            <textarea
              name="csv"
              rows={6}
              className={`${inputClass} font-mono text-xs`}
              placeholder={'Fastighet;Adress;Stad;Lägenhetsnummer;Rum;Kvm;Hyra\nBjörken 1;Storgatan 1;Umeå;1001;2;55;8500'}
            />
          </label>
          <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-sm leading-6 text-[#78350f]">
            <strong>Integritetsspärr:</strong> importcentret hanterar endast fastighets- och lägenhetsdata. Filer med
            kolumner för hyresgästers namn, personnummer, e-post eller telefon avvisas automatiskt.
          </div>
          <div>
            <Button type="submit">Skapa projekt</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Projekt</h2>
        {!projects?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga importprojekt ännu.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/landlord/import/${project.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#e8ebf3] p-4 transition hover:bg-[#f7f8fc]"
              >
                <div>
                  <div className="font-semibold text-[#111827]">{project.name}</div>
                  <div className="mt-1 text-sm text-[#6b7280]">
                    {project.source_label ?? 'Okänt källsystem'} · {new Date(project.created_at).toLocaleDateString('sv-SE')}
                  </div>
                </div>
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">
                  {statusLabels[project.status] ?? project.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </LandlordShell>
  )
}
