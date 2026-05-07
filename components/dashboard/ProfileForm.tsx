import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { DashboardProfileItem } from '@/lib/types'
import {
  addCoApplicantAction,
  addProfileDocumentAction,
  pauseQueueMembershipAction,
  removeCoApplicantAction,
  removeProfileDocumentAction,
  resumeQueueMembershipAction,
  saveProfileAction,
  startQueueMembershipAction,
} from '@/app/dashboard/profile/actions'

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('sv-SE').format(new Date(value))
  } catch {
    return value
  }
}

export function ProfileForm({ profile }: { profile: DashboardProfileItem }) {
  const queue = profile.queueMembership
  const queueActive = queue?.status === 'active'

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Grundprofil</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Den här profilen används som grund inför framtida hyresansökningar och ger hyresvärdar bättre underlag.</p>
          </div>

          <form action={saveProfileAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="firstName" placeholder="Förnamn" defaultValue={profile.firstName} />
              <Input name="lastName" placeholder="Efternamn" defaultValue={profile.lastName} />
              <Input value={profile.email} readOnly disabled className="opacity-70" />
              <Input name="phone" placeholder="Telefon" defaultValue={profile.phone} />
              <Input name="city" placeholder="Stad" defaultValue={profile.city} />
              <Input name="householdSize" type="number" min={1} placeholder="Hushållsstorlek" defaultValue={profile.householdSize ?? undefined} />
              <Select name="employmentStatus" defaultValue={profile.employmentStatus || 'employed'}>
                <option value="employed">Anställd</option>
                <option value="self_employed">Egenföretagare</option>
                <option value="student">Student</option>
                <option value="retired">Pensionär</option>
                <option value="other">Övrigt</option>
              </Select>
              <Input name="employerName" placeholder="Arbetsgivare" defaultValue={profile.employerName} />
              <Input name="monthlyIncome" type="number" min={0} placeholder="Månadsinkomst" defaultValue={profile.monthlyIncome ?? undefined} />
              <Input name="desiredMoveIn" type="date" placeholder="Önskat inflyttningsdatum" defaultValue={profile.desiredMoveIn ?? undefined} />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                name="desiredLocations"
                placeholder="Önskade områden, separera med kommatecken"
                defaultValue={profile.desiredLocations.join(', ')}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="hasPets" defaultChecked={profile.hasPets} />
                Har husdjur
              </label>
            </div>

            <div className="flex justify-end">
              <Button>Spara profil</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Medsökande</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Lägg till partner eller medsökande så att det kan återanvändas i kommande ansökningar.</p>
            </div>
            <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">{profile.coApplicants.length} st</div>
          </div>

          <form action={addCoApplicantAction} className="grid gap-4 md:grid-cols-2">
            <Input name="fullName" placeholder="Fullständigt namn" />
            <Input name="relationship" placeholder="Relation" />
            <Input name="email" type="email" placeholder="E-post" />
            <Input name="phone" placeholder="Telefon" />
            <div className="md:col-span-2 flex justify-end">
              <Button variant="secondary">Lägg till medsökande</Button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {profile.coApplicants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-[var(--muted)]">Inga medsökande sparade ännu.</div>
            ) : (
              profile.coApplicants.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-black/8 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{item.fullName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{item.relationship || 'Ingen relation angiven'} • {item.email || 'Ingen e-post'} • {item.phone || 'Ingen telefon'}</div>
                  </div>
                  <form action={removeCoApplicantAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button variant="ghost" className="border border-black/8">Ta bort</Button>
                  </form>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Profil­dokument</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Lägg till dokument som senare kan kopplas till riktig filuppladdning. Redan nu kan du spara metadata och länkar.</p>
            </div>
            <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">{profile.documents.length} st</div>
          </div>

          <form action={addProfileDocumentAction} className="grid gap-4 md:grid-cols-3">
            <Input name="fileName" placeholder="Filnamn" />
            <Input name="fileUrl" placeholder="Fil-URL" />
            <Input name="documentType" placeholder="Dokumenttyp, t.ex. income-proof" />
            <div className="md:col-span-3 flex justify-end">
              <Button variant="secondary">Lägg till dokument</Button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {profile.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-[var(--muted)]">Inga dokument sparade ännu.</div>
            ) : (
              profile.documents.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-black/8 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{item.fileName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{item.documentType} • {formatDate(item.createdAt)}</div>
                    <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[var(--primary)] underline underline-offset-4">
                      Öppna länk
                    </a>
                  </div>
                  <form action={removeProfileDocumentAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button variant="ghost" className="border border-black/8">Ta bort</Button>
                  </form>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="inline-flex rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">Köpoäng</div>
          <h2 className="mt-4 text-2xl font-semibold">Bovaro Kö+</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Köpoäng fungerar som ett extra incitament. Hyresvärdar kan se köpoäng och kötid, men de måste inte välja efter poäng.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Nuvarande poäng</div>
              <div className="mt-2 text-3xl font-semibold">{queue?.currentPoints ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Månader i kö</div>
              <div className="mt-2 text-3xl font-semibold">{queue?.monthsInQueue ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Köstart</div>
              <div className="mt-2 text-lg font-semibold">{formatDate(queue?.joinedQueueAt ?? null)}</div>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Status</div>
              <div className="mt-2 text-lg font-semibold capitalize">{queue?.status ?? 'Inte aktiv'}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Subscription: {queue?.subscriptionStatus ?? 'inte startad'}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/5 p-4 text-sm text-[var(--muted)]">
            Nästa betalperiod: <span className="font-semibold text-[var(--foreground)]">{formatDate(queue?.nextBillingAt ?? null)}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!queue ? (
              <form action={startQueueMembershipAction}>
                <Button>Starta Kö+</Button>
              </form>
            ) : queueActive ? (
              <form action={pauseQueueMembershipAction}>
                <Button variant="ghost" className="border border-black/8">Pausa Kö+</Button>
              </form>
            ) : (
              <form action={resumeQueueMembershipAction}>
                <Button>Återaktivera Kö+</Button>
              </form>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Hur hyresvärdar ser detta</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>• Köpoäng syns som en extra signal, inte som ett tvång.</li>
            <li>• Köstartdatum gör att hyresvärden ser hur länge du varit aktiv.</li>
            <li>• Aktivt medlemskap gör profilen mer attraktiv men ersätter inte inkomst, referenser eller manuell bedömning.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
