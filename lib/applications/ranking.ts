/**
 * Applicant ranking engine per listing selection method.
 */

export type SelectionMethod = 'strict_queue' | 'guided_queue' | 'first_come' | 'random' | 'manual_with_policy'

export type RankableApplication = {
  id: string
  queuePointsSnapshot: number
  createdAt: string
  policyResult: string | null
  randomRank: number | null
}

export type RankedApplication<T extends RankableApplication> = {
  application: T
  rank: number | null
  rankLabel: string | null
}

function isEligible(application: RankableApplication) {
  return application.policyResult !== 'not_eligible'
}

/**
 * Ranks applications according to the selection method. Eligible applicants
 * are always ranked ahead of not-eligible ones. For 'manual_with_policy' no
 * rank is produced. For 'random', applications without an assigned
 * random_rank get no rank until the order is generated.
 */
export function rankApplications<T extends RankableApplication>(
  method: SelectionMethod,
  applications: T[],
): RankedApplication<T>[] {
  if (method === 'manual_with_policy') {
    return applications.map((application) => ({ application, rank: null, rankLabel: null }))
  }

  const compare = (a: T, b: T): number => {
    // Eligibility first.
    const eligibleDiff = Number(isEligible(b)) - Number(isEligible(a))
    if (eligibleDiff !== 0) return eligibleDiff

    if (method === 'strict_queue' || method === 'guided_queue') {
      if (b.queuePointsSnapshot !== a.queuePointsSnapshot) {
        return b.queuePointsSnapshot - a.queuePointsSnapshot
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }

    if (method === 'first_come') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }

    // random
    const aRank = a.randomRank ?? Number.POSITIVE_INFINITY
    const bRank = b.randomRank ?? Number.POSITIVE_INFINITY
    return aRank - bRank
  }

  const sorted = [...applications].sort(compare)

  return sorted.map((application, index) => {
    const unranked = method === 'random' && application.randomRank === null
    return {
      application,
      rank: unranked ? null : index + 1,
      rankLabel: unranked
        ? null
        : method === 'guided_queue'
          ? `Rekommenderad plats ${index + 1}`
          : `Plats ${index + 1}`,
    }
  })
}

export const SELECTION_METHOD_LABELS: Record<SelectionMethod, string> = {
  strict_queue: 'Strikt kötid',
  guided_queue: 'Vägledd kötid',
  first_come: 'Först till kvarn',
  random: 'Slumpad ordning',
  manual_with_policy: 'Manuellt urval med krav',
}
