import Link from 'next/link'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { normalizeStatus, statusLabel, TERMINAL_STATUSES } from '@/lib/applications/status-machine'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const FILTERS = [
  { value: 'all', label: 'Alla' },
  { value: 'active', label: 'Aktiva' },
  { value: 'eligible', label: 'Uppfyller krav' },
  { value: 'missing', label: 'Saknar uppgifter' },
  { value: 'closed', label: 'Avslutade' },
]

export default async function LandlordApplicationsPage({ searchParams }: Props) {
  const params = await searchParams
  const context = await requireLandlordAccess()
  const { supabase, user, companyIds } = context

  const filter = typeof params.filter === 'string' ? params.filter : 'all'

  const applicationsFilter = companyIds.length
    ? `landlord_user_id.eq.${user.id},landlord_company_id.in.(${companyIds.join(',')})`
    : `landlord_user_id.eq.${user.id}`

  const { data: applications } = await supabase
    .from('rental_applications')
    .select('id, status, created_at, listing_id, listing_title, listing_city, applicant_full_name, queue_points_snapshot')
    .or(applicationsFilter)
    .order('created_at', { ascending: false })
    .limit(300)

  const applicationIds = (applications ?? []).map((application) => application.id)
  const { data: policyResults } = applicationIds.length
    ? await supabase.from('application_policy_results').select('application_id, result').in('application_id', applicationIds)
    : { data: [] }
  const policyMap = new Map((policyResults ?? []).map((row) => [row.application_id, row.result]))

  const filtered = (applications ?? []).filter((application) => {
    const canonical = normalizeStatus(application.status)
    const isTerminal = (TERMINAL_STATUSES as string[]).includes(canonical)
    const policy = policyMap.get(application.id) ?? null

    if (filter === 'active') return !isTerminal
    if (filter === 'closed') return isTerminal
    if (filter === 'eligible') return policy === 'eligible' || policy === 'likely_eligible'
    if (filter === 'missing') return policy === 'missing_info'
    return true
  })

  // Group by listing for a pipeline-style overview.
  const byListing = new Map<string, { title: string; city: string; listingId: string | null; items: typeof filtered }>()
  for (const application of filtered) {
    const key = application.listing_id ?? application.listing_title ?? 'okand'
    const group = byListing.get(key) ?? {
      title: application.listing_title ?? 'Okänd annons',
      city: application.listing_city ?? '',
      listingId: application.listing_id,
      items: [] as typeof filtered,
    }
    group.items.push(application)
    byListing.set(key, group)
  }

  return (
    <LandlordShell
      activePath="/landlord/applications"
      title="Ansökningar"
      description="Alla inkommande ansökningar per annons. Öppna en annons för att hantera status, urval och kompletteringar."
    >
      <Card className="p-6">
        <form className="flex flex-wrap items-center gap-3">
          <Select name="filter" defaultValue={filter} className="h-11 min-w-[200px]">
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" className="h-11">Filtrera</Button>
          <span className="text-sm text-[#6b7280]">{filtered.length} ansökningar</span>
        </form>
      </Card>

      {byListing.size === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga ansökningar</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            När sökande ansöker om era publicerade annonser visas de här.
          </p>
        </Card>
      ) : (
        Array.from(byListing.values()).map((group) => (
          <Card key={group.listingId ?? group.title} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">{group.title}</h2>
                <p className="mt-1 text-sm text-[#6b7280]">{group.city}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">
                  {group.items.length} sökande
                </span>
                {group.listingId ? (
                  <Link href={`/dashboard/listings/${group.listingId}`} className="text-sm font-semibold text-[#1d4ed8]">
                    Hantera urval →
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    <th className="py-2 pr-4">Sökande</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Matchkoll</th>
                    <th className="py-2 pr-4">Köpoäng</th>
                    <th className="py-2">Inkommen</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((application) => {
                    const policy = policyMap.get(application.id) ?? null
                    return (
                      <tr key={application.id} className="border-b border-[#f4f5fa]">
                        <td className="py-2 pr-4 font-semibold text-[#111827]">{application.applicant_full_name}</td>
                        <td className="py-2 pr-4">{statusLabel(application.status)}</td>
                        <td className="py-2 pr-4">
                          {policy ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                policy === 'eligible'
                                  ? 'bg-[#dcfce7] text-[#166534]'
                                  : policy === 'likely_eligible'
                                    ? 'bg-[#dbeafe] text-[#1d4ed8]'
                                    : policy === 'missing_info'
                                      ? 'bg-[#fef3c7] text-[#92400e]'
                                      : 'bg-[#fee2e2] text-[#b91c1c]'
                              }`}
                            >
                              {policy === 'eligible'
                                ? 'Uppfyller'
                                : policy === 'likely_eligible'
                                  ? 'Troligen'
                                  : policy === 'missing_info'
                                    ? 'Saknar uppgifter'
                                    : 'Uppfyller ej'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 pr-4">{application.queue_points_snapshot}</td>
                        <td className="py-2">{new Date(application.created_at).toLocaleDateString('sv-SE')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </LandlordShell>
  )
}
