import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { DashboardProfileItem } from '@/lib/types'
import {
  addCoApplicantAction,
  addGuarantorAction,
  addProfileDocumentAction,
  inviteCoApplicantAction,
  pauseQueueMembershipAction,
  removeCoApplicantAction,
  removeGuarantorAction,
  removeProfileDocumentAction,
  resumeQueueMembershipAction,
  saveProfileAction,
  startQueueMembershipAction,
} from '@/app/dashboard/profile/actions'

const INVITE_STATUS_LABELS: Record<string, string> = {
  none: 'Ej inbjuden',
  invited: 'Inbjuden – väntar på svar',
  accepted: 'Har accepterat och samtyckt',
  declined: 'Tackade nej',
}

export type QueueLedgerEntryView = {
  id: string
  eventType: string
  pointsDelta: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

const LEDGER_EVENT_LABELS: Record<string, string> = {
  enrolled: 'Gick med i kön',
  daily_accrual: 'Daglig poäng',
  monthly_accrual: 'Poänguppdatering',
  manual_adjustment: 'Manuell justering',
  paused: 'Pausad',
  resumed: 'Återupptagen',
  cancelled: 'Avslutad',
  reset: 'Nollställd',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('sv-SE').format(new Date(value))
  } catch {
    return value
  }
}

export function ProfileForm({
  profile,
  queueLedger = [],
}: {
  profile: DashboardProfileItem
  queueLedger?: QueueLedgerEntryView[]
}) {
  const queue = profile.queueMembership
  const queueActive = queue?.status === 'active'
  const company = profile.companies[0] ?? null
  const isCompanyRole = ['landlord', 'broker', 'company_admin'].includes(profile.role)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Grundprofil och roll</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Välj om du använder Bovaro som hyresgäst, köpare, privat hyresvärd eller som representant för ett bolag.
            </p>
          </div>

          <form action={saveProfileAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="firstName" placeholder="Förnamn" defaultValue={profile.firstName} />
              <Input name="lastName" placeholder="Efternamn" defaultValue={profile.lastName} />
              <Input value={profile.email} readOnly disabled className="opacity-70" />
              <Input name="phone" placeholder="Telefon" defaultValue={profile.phone} />
              <Select name="accountType" defaultValue={profile.accountType ?? 'private'}>
                <option value="private">Privatperson</option>
                <option value="company">Företag</option>
              </Select>
              <Select name="preferredListingIntent" defaultValue={profile.preferredListingIntent ?? 'both'}>
                <option value="rent">Främst hyra</option>
                <option value="buy">Främst köpa</option>
                <option value="both">Både hyra och köpa</option>
              </Select>
              <Select name="role" defaultValue={profile.role}>
                <option value="seeker">Hyresgäst / bostadssökande</option>
                <option value="buyer">Köpare</option>
                <option value="landlord">Hyresvärd</option>
                <option value="broker">Mäklare</option>
                <option value="company_admin">Bolagsadmin / fastighetsbolag</option>
                              </Select>
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
              <Select name="incomeType" defaultValue={profile.incomeType ?? ''}>
                <option value="">Typ av inkomst…</option>
                <option value="salary">Lön</option>
                <option value="pension">Pension</option>
                <option value="student_aid">Studiemedel</option>
                <option value="benefits">Ersättning/bidrag</option>
                <option value="business_income">Näringsinkomst</option>
                <option value="other">Annan</option>
              </Select>
              <Select name="studyStatus" defaultValue={profile.studyStatus ?? ''}>
                <option value="">Studerar du?…</option>
                <option value="not_studying">Studerar inte</option>
                <option value="full_time">Heltidsstudier</option>
                <option value="part_time">Deltidsstudier</option>
              </Select>
              <Select name="currentHousingSituation" defaultValue={profile.currentHousingSituation ?? ''}>
                <option value="">Nuvarande boende…</option>
                <option value="first_hand">Förstahandskontrakt</option>
                <option value="second_hand">Andrahandskontrakt</option>
                <option value="owned">Äger bostad</option>
                <option value="parents">Bor hos föräldrar</option>
                <option value="lodger">Inneboende</option>
                <option value="student_housing">Studentbostad</option>
                <option value="other">Annat</option>
              </Select>
              <Input name="desiredMoveIn" type="date" placeholder="Önskat inflyttningsdatum" defaultValue={profile.desiredMoveIn ?? undefined} />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="marketingConsent" defaultChecked={profile.marketingConsent ?? false} />
                Bostadstips via e-post
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <Input
                name="desiredLocations"
                placeholder="Önskade områden, separera med kommatecken"
                defaultValue={profile.desiredLocations.join(', ')}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="hasPets" defaultChecked={profile.hasPets} />
                Har husdjur
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="smoking" defaultChecked={profile.smoking ?? false} />
                Rökning i hushållet
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="guarantorAvailable" defaultChecked={profile.guarantorAvailable ?? false} />
                Borgensman finns
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Personligt brev</label>
              <textarea
                name="personalLetter"
                rows={5}
                defaultValue={profile.personalLetter ?? ''}
                placeholder="Berätta kort om dig själv, ditt hushåll och varför du är en trygg hyresgäst. Brevet återanvänds i dina ansökningar."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
              />
            </div>

            <div className="rounded-[24px] border border-black/8 bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold">Bolag / organisationsroll</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Fyll i detta om du är hyresvärd via bolag, fastighetsbolag, mäklarfirma eller hyresvärd som aktiebolag.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input name="companyName" placeholder="Bolagsnamn" defaultValue={company?.name ?? ''} />
                <Select name="companyType" defaultValue={company?.companyType ?? 'landlord_company'}>
                  <option value="private_landlord">Privat hyresvärd</option>
                  <option value="landlord_company">Hyresvärd som bolag</option>
                  <option value="brokerage">Mäklare / mäklarfirma</option>
                  <option value="housing_association">Bostadsrättsförening</option>
                  <option value="property_owner">Fastighetsägare</option>
                  <option value="other">Övrigt</option>
                </Select>
                <Select name="legalForm" defaultValue={company?.legalForm ?? 'ab'}>
                  <option value="ab">Aktiebolag (AB)</option>
                  <option value="enskild_firma">Enskild firma</option>
                  <option value="hb">Handelsbolag</option>
                  <option value="kb">Kommanditbolag</option>
                  <option value="ideell_forening">Förening</option>
                  <option value="privatperson">Privatperson</option>
                  <option value="other">Övrigt</option>
                </Select>
                <Input name="orgNumber" placeholder="Organisationsnummer" defaultValue="" />
                <Input name="companyCity" placeholder="Bolagsstad" defaultValue={company ? profile.city : ''} />
                <Input name="companyPhone" placeholder="Bolagstelefon" defaultValue="" />
                <Input name="companyEmail" placeholder="Bolagsmail" defaultValue="" />
              </div>

              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[var(--muted)]">
                Aktiv roll just nu: <span className="font-semibold text-[var(--foreground)]">{profile.role}</span>
                {company ? (
                  <> • Kopplat bolag: <span className="font-semibold text-[var(--foreground)]">{company.name}</span></>
                ) : isCompanyRole ? (
                  <> • Inget bolag kopplat ännu</>
                ) : null}
              </div>
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
                <div key={item.id} className="rounded-2xl border border-black/8 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">{item.fullName}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{item.relationship || 'Ingen relation angiven'} • {item.email || 'Ingen e-post'} • {item.phone || 'Ingen telefon'}</div>
                      <div className="mt-2 inline-flex rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {INVITE_STATUS_LABELS[item.inviteStatus ?? 'none']}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.inviteStatus !== 'accepted' ? (
                        <form action={inviteCoApplicantAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <Button variant="secondary" className="text-sm">
                            {item.inviteStatus === 'invited' ? 'Skapa ny inbjudningslänk' : 'Bjud in för samtycke'}
                          </Button>
                        </form>
                      ) : null}
                      <form action={removeCoApplicantAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button variant="ghost" className="border border-black/8">Ta bort</Button>
                      </form>
                    </div>
                  </div>
                  {item.inviteStatus === 'invited' && item.inviteToken ? (
                    <div className="mt-3 rounded-2xl bg-[#f7f8fc] p-3 text-xs text-[var(--muted)]">
                      Dela denna länk med din medsökande så att hen kan acceptera och samtycka:
                      <div className="mt-1 select-all break-all font-mono text-[11px] text-[var(--foreground)]">
                        {`/co-applicant/invite/${item.inviteToken}`}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Borgensman</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Om du har en borgensman kan det stärka dina ansökningar hos vissa hyresvärdar.</p>
            </div>
            <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">{profile.guarantors?.length ?? 0} st</div>
          </div>

          <form action={addGuarantorAction} className="grid gap-4 md:grid-cols-2">
            <Input name="fullName" placeholder="Fullständigt namn" />
            <Input name="relationship" placeholder="Relation, t.ex. förälder" />
            <Input name="email" type="email" placeholder="E-post" />
            <Input name="phone" placeholder="Telefon" />
            <Input name="monthlyIncome" type="number" min={0} placeholder="Månadsinkomst (valfritt)" />
            <div className="flex justify-end md:col-span-1">
              <Button variant="secondary">Lägg till borgensman</Button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {(profile.guarantors ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-[var(--muted)]">Ingen borgensman tillagd.</div>
            ) : (
              (profile.guarantors ?? []).map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-black/8 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{item.fullName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {item.relationship || 'Ingen relation angiven'} • {item.email || 'Ingen e-post'} • {item.phone || 'Ingen telefon'}
                      {item.monthlyIncome ? ` • ${item.monthlyIncome} kr/mån` : ''}
                    </div>
                  </div>
                  <form action={removeGuarantorAction}>
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
              <h2 className="text-xl font-semibold">Profildokument</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Lägg till dokument som senare kan kopplas till riktig filuppladdning. Redan nu kan du spara metadata och länkar.</p>
            </div>
            <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">{profile.documents.length} st</div>
          </div>

          <form action={addProfileDocumentAction} encType="multipart/form-data" className="grid gap-4 md:grid-cols-3">
            <Input name="fileName" placeholder="Filnamn" />
            <Input name="file" type="file" accept=".pdf,image/*,.doc,.docx" />
            <Input name="fileUrl" placeholder="Alternativ fil-URL" />
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
          <div className="inline-flex rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">Bostadskö</div>
          <h2 className="mt-4 text-2xl font-semibold">Bovaro bostadskö</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Kön är kostnadsfri. Du samlar 1 köpoäng per dag i kön, och poängen följer med i dina ansökningar.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Nuvarande poäng</div>
              <div className="mt-2 text-3xl font-semibold">{queue?.currentPoints ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="text-sm text-[var(--muted)]">Köstart</div>
              <div className="mt-2 text-lg font-semibold">{formatDate(queue?.joinedQueueAt ?? null)}</div>
            </div>
            <div className="rounded-2xl border border-black/8 p-4 sm:col-span-2">
              <div className="text-sm text-[var(--muted)]">Status</div>
              <div className="mt-2 text-lg font-semibold capitalize">{queue?.status ?? 'Inte aktiv'}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!queue ? (
              <form action={startQueueMembershipAction}>
                <Button>Gå med i kön</Button>
              </form>
            ) : queueActive ? (
              <form action={pauseQueueMembershipAction}>
                <Button variant="ghost" className="border border-black/8">Pausa köplats</Button>
              </form>
            ) : (
              <form action={resumeQueueMembershipAction}>
                <Button>Återaktivera köplats</Button>
              </form>
            )}
          </div>

          {queueLedger.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Köhistorik</h3>
              <ul className="mt-3 space-y-2">
                {queueLedger.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.03] px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-semibold">{LEDGER_EVENT_LABELS[entry.eventType] ?? entry.eventType}</span>
                      <span className="ml-2 text-xs text-[var(--muted)]">{formatDate(entry.createdAt)}</span>
                    </div>
                    <div className="text-right">
                      <span className={entry.pointsDelta >= 0 ? 'font-semibold text-[#15803d]' : 'font-semibold text-[#b91c1c]'}>
                        {entry.pointsDelta >= 0 ? '+' : ''}{entry.pointsDelta}
                      </span>
                      <span className="ml-2 text-xs text-[var(--muted)]">saldo {entry.balanceAfter}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Hur rollerna fungerar</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>• Hyresgäst / köpare använder kontot som privatperson.</li>
            <li>• Hyresvärd kan vara privat eller representera ett bolag.</li>
            <li>• Bolag kan ha legal form som AB, enskild firma eller annan form.</li>
            <li>• Admin och superadmin finns i systemet som egna roller för intern styrning.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
