/**
 * Matchkoll — Bovaro's policy evaluation engine.
 *
 * Evaluates an applicant's facts against a landlord's policy rules and
 * produces an explainable result in Swedish. Pure and unit-tested; all data
 * loading happens in the caller.
 *
 * Results:
 *  - eligible:        every rule passed
 *  - likely_eligible: no rule failed, but something could not be verified
 *                     (e.g. screening provider not configured)
 *  - missing_info:    no rule failed, but the applicant can complete data
 *                     (documents, profile fields, custom questions)
 *  - not_eligible:    at least one rule failed
 */

export type PolicyRuleType =
  | 'min_income'
  | 'income_multiplier'
  | 'accepted_employment_types'
  | 'no_active_debt'
  | 'max_household_size'
  | 'min_household_size'
  | 'pets_allowed'
  | 'smoking_allowed'
  | 'student_only'
  | 'senior_only'
  | 'guarantor_allowed'
  | 'register_extract_required'
  | 'required_documents'
  | 'custom_question'

export type PolicyRule = {
  id: string
  ruleType: PolicyRuleType
  config: Record<string, unknown>
}

export type ApplicantFacts = {
  monthlyIncome: number | null
  employmentType: string | null
  householdSize: number | null
  hasPets: boolean
  smoking: boolean
  isStudent: boolean
  /** Age from verified identity; null when unknown. */
  age: number | null
  hasGuarantor: boolean
  /** Document types with usable status (active/pending_review, not expired). */
  documentTypes: string[]
  /** Screening results; null values mean "could not be verified". */
  screening: {
    hasActiveDebt: boolean | null
  }
}

export type RuleOutcomeStatus = 'passed' | 'failed' | 'missing_info' | 'unverifiable'

export type RuleOutcome = {
  ruleType: PolicyRuleType
  status: RuleOutcomeStatus
  /** Swedish, user-facing explanation. */
  explanation: string
}

export type MatchkollResult = 'eligible' | 'likely_eligible' | 'missing_info' | 'not_eligible'

export type PolicyEvaluation = {
  result: MatchkollResult
  outcomes: RuleOutcome[]
  passedCount: number
  failedCount: number
  missingCount: number
  unverifiableCount: number
}

const DOCUMENT_LABELS: Record<string, string> = {
  income_proof: 'inkomstintyg',
  salary_slip: 'lönespecifikation',
  employment_certificate: 'anställningsintyg',
  register_extract: 'registerutdrag',
  student_certificate: 'studieintyg',
  reference: 'referens',
  id_document: 'ID-handling',
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: 'anställd',
  self_employed: 'egenföretagare',
  student: 'student',
  retired: 'pensionär',
  unemployed: 'arbetssökande',
  other: 'övrigt',
}

function toNumberConfig(config: Record<string, unknown>, key: string): number | null {
  const value = config[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function toStringArrayConfig(config: Record<string, unknown>, key: string): string[] {
  const value = config[key]
  if (Array.isArray(value)) return value.map(String)
  return []
}

function toBooleanConfig(config: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = config[key]
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function evaluateRule(rule: PolicyRule, facts: ApplicantFacts, rentAmount: number): RuleOutcome {
  const { ruleType, config } = rule

  switch (ruleType) {
    case 'min_income': {
      const amount = toNumberConfig(config, 'amount') ?? 0
      if (facts.monthlyIncome === null) {
        return { ruleType, status: 'missing_info', explanation: 'Ange din månadsinkomst i profilen för att kravet ska kunna bedömas.' }
      }
      return facts.monthlyIncome >= amount
        ? { ruleType, status: 'passed', explanation: `Din inkomst uppfyller kravet på minst ${amount.toLocaleString('sv-SE')} kr/mån.` }
        : { ruleType, status: 'failed', explanation: `Hyresvärden kräver en inkomst på minst ${amount.toLocaleString('sv-SE')} kr/mån.` }
    }

    case 'income_multiplier': {
      const multiplier = toNumberConfig(config, 'multiplier') ?? 3
      const required = Math.round(rentAmount * multiplier)
      if (facts.monthlyIncome === null) {
        return { ruleType, status: 'missing_info', explanation: 'Ange din månadsinkomst i profilen för att kravet ska kunna bedömas.' }
      }
      return facts.monthlyIncome >= required
        ? { ruleType, status: 'passed', explanation: `Din inkomst uppfyller kravet på minst ${multiplier}× hyran (${required.toLocaleString('sv-SE')} kr/mån).` }
        : { ruleType, status: 'failed', explanation: `Hyresvärden kräver en inkomst på minst ${multiplier}× hyran (${required.toLocaleString('sv-SE')} kr/mån).` }
    }

    case 'accepted_employment_types': {
      const accepted = toStringArrayConfig(config, 'types')
      if (accepted.length === 0) {
        return { ruleType, status: 'passed', explanation: 'Alla sysselsättningsformer accepteras.' }
      }
      if (!facts.employmentType) {
        return { ruleType, status: 'missing_info', explanation: 'Ange din sysselsättning i profilen för att kravet ska kunna bedömas.' }
      }
      const acceptedLabels = accepted.map((type) => EMPLOYMENT_LABELS[type] ?? type).join(', ')
      return accepted.includes(facts.employmentType)
        ? { ruleType, status: 'passed', explanation: 'Din sysselsättning accepteras av hyresvärden.' }
        : { ruleType, status: 'failed', explanation: `Hyresvärden accepterar endast: ${acceptedLabels}.` }
    }

    case 'no_active_debt': {
      if (facts.screening.hasActiveDebt === null) {
        return {
          ruleType,
          status: 'unverifiable',
          explanation: 'Hyresvärden kräver inga aktiva skulder hos Kronofogden. Detta kontrolleras senare i processen.',
        }
      }
      return facts.screening.hasActiveDebt
        ? { ruleType, status: 'failed', explanation: 'Hyresvärden kräver att du inte har aktiva skulder hos Kronofogden.' }
        : { ruleType, status: 'passed', explanation: 'Inga aktiva skulder registrerade.' }
    }

    case 'max_household_size': {
      const size = toNumberConfig(config, 'size') ?? 99
      if (facts.householdSize === null) {
        return { ruleType, status: 'missing_info', explanation: 'Ange hushållsstorlek i profilen för att kravet ska kunna bedömas.' }
      }
      return facts.householdSize <= size
        ? { ruleType, status: 'passed', explanation: `Hushållsstorleken ryms inom maxgränsen (${size} personer).` }
        : { ruleType, status: 'failed', explanation: `Bostaden tillåter max ${size} person${size === 1 ? '' : 'er'} i hushållet.` }
    }

    case 'min_household_size': {
      const size = toNumberConfig(config, 'size') ?? 1
      if (facts.householdSize === null) {
        return { ruleType, status: 'missing_info', explanation: 'Ange hushållsstorlek i profilen för att kravet ska kunna bedömas.' }
      }
      return facts.householdSize >= size
        ? { ruleType, status: 'passed', explanation: `Hushållsstorleken uppfyller kravet på minst ${size} person${size === 1 ? '' : 'er'}.` }
        : { ruleType, status: 'failed', explanation: `Bostaden kräver minst ${size} person${size === 1 ? '' : 'er'} i hushållet.` }
    }

    case 'pets_allowed': {
      const allowed = toBooleanConfig(config, 'allowed', true)
      if (allowed) return { ruleType, status: 'passed', explanation: 'Husdjur är tillåtna.' }
      return facts.hasPets
        ? { ruleType, status: 'failed', explanation: 'Husdjur är inte tillåtna i den här bostaden.' }
        : { ruleType, status: 'passed', explanation: 'Husdjur är inte tillåtna — du har inte angett husdjur.' }
    }

    case 'smoking_allowed': {
      const allowed = toBooleanConfig(config, 'allowed', false)
      if (allowed) return { ruleType, status: 'passed', explanation: 'Rökning är tillåten.' }
      return facts.smoking
        ? { ruleType, status: 'failed', explanation: 'Rökning är inte tillåten i den här bostaden.' }
        : { ruleType, status: 'passed', explanation: 'Rökfri bostad — du har angett att hushållet är rökfritt.' }
    }

    case 'student_only': {
      return facts.isStudent
        ? { ruleType, status: 'passed', explanation: 'Bostaden är för studenter — du studerar.' }
        : { ruleType, status: 'failed', explanation: 'Bostaden är endast för studerande.' }
    }

    case 'senior_only': {
      const minAge = toNumberConfig(config, 'min_age') ?? 55
      if (facts.age === null) {
        return { ruleType, status: 'missing_info', explanation: `Bostaden är för seniorer (${minAge}+). Verifiera din identitet så att din ålder kan bedömas.` }
      }
      return facts.age >= minAge
        ? { ruleType, status: 'passed', explanation: `Du uppfyller ålderskravet ${minAge}+.` }
        : { ruleType, status: 'failed', explanation: `Bostaden är endast för personer som fyllt ${minAge} år.` }
    }

    case 'guarantor_allowed': {
      const allowed = toBooleanConfig(config, 'allowed', true)
      if (allowed) {
        return facts.hasGuarantor
          ? { ruleType, status: 'passed', explanation: 'Borgensman accepteras och du har angett en borgensman.' }
          : { ruleType, status: 'passed', explanation: 'Borgensman accepteras av hyresvärden.' }
      }
      return facts.hasGuarantor
        ? { ruleType, status: 'failed', explanation: 'Hyresvärden accepterar inte borgensman som inkomstgaranti.' }
        : { ruleType, status: 'passed', explanation: 'Borgensman används inte i din ansökan.' }
    }

    case 'register_extract_required': {
      return facts.documentTypes.includes('register_extract')
        ? { ruleType, status: 'passed', explanation: 'Registerutdrag finns i din profil.' }
        : { ruleType, status: 'missing_info', explanation: 'Hyresvärden kräver registerutdrag — ladda upp det under Dokument.' }
    }

    case 'required_documents': {
      const required = toStringArrayConfig(config, 'types')
      if (required.length === 0) return { ruleType, status: 'passed', explanation: 'Inga särskilda dokument krävs.' }
      const missing = required.filter((type) => !facts.documentTypes.includes(type))
      if (missing.length === 0) {
        return { ruleType, status: 'passed', explanation: 'Alla dokument som hyresvärden kräver finns i din profil.' }
      }
      const missingLabels = missing.map((type) => DOCUMENT_LABELS[type] ?? type).join(', ')
      return { ruleType, status: 'missing_info', explanation: `Dokument saknas: ${missingLabels}. Ladda upp under Dokument.` }
    }

    case 'custom_question': {
      const question = typeof config.question === 'string' ? config.question : 'Hyresvärden har en egen fråga'
      return { ruleType, status: 'unverifiable', explanation: `Hyresvärdens fråga besvaras i ansökan: "${question}"` }
    }

    default:
      return { ruleType, status: 'unverifiable', explanation: 'Okänd regel — bedöms manuellt av hyresvärden.' }
  }
}

export function evaluatePolicy(rules: PolicyRule[], facts: ApplicantFacts, rentAmount: number): PolicyEvaluation {
  const outcomes = rules.map((rule) => evaluateRule(rule, facts, rentAmount))

  const failedCount = outcomes.filter((outcome) => outcome.status === 'failed').length
  const missingCount = outcomes.filter((outcome) => outcome.status === 'missing_info').length
  const unverifiableCount = outcomes.filter((outcome) => outcome.status === 'unverifiable').length
  const passedCount = outcomes.filter((outcome) => outcome.status === 'passed').length

  let result: MatchkollResult
  if (failedCount > 0) {
    result = 'not_eligible'
  } else if (missingCount > 0) {
    result = 'missing_info'
  } else if (unverifiableCount > 0) {
    result = 'likely_eligible'
  } else {
    result = 'eligible'
  }

  return { result, outcomes, passedCount, failedCount, missingCount, unverifiableCount }
}

/**
 * Derives implicit policy rules from the legacy rental_requirements row so
 * Matchkoll works for listings without an explicit policy.
 */
export function rulesFromRentalRequirements(requirements: {
  minIncome: number | null
  petsAllowed: boolean
  smokingAllowed: boolean
  referencesRequired: boolean
  employmentRequired: boolean
}): PolicyRule[] {
  const rules: PolicyRule[] = []

  if (requirements.minIncome) {
    rules.push({ id: 'req-min-income', ruleType: 'min_income', config: { amount: requirements.minIncome } })
  }
  rules.push({ id: 'req-pets', ruleType: 'pets_allowed', config: { allowed: requirements.petsAllowed } })
  rules.push({ id: 'req-smoking', ruleType: 'smoking_allowed', config: { allowed: requirements.smokingAllowed } })
  if (requirements.employmentRequired) {
    rules.push({
      id: 'req-employment',
      ruleType: 'accepted_employment_types',
      config: { types: ['employed', 'self_employed'] },
    })
  }
  if (requirements.referencesRequired) {
    rules.push({ id: 'req-references', ruleType: 'required_documents', config: { types: ['reference'] } })
  }

  return rules
}

export const MATCHKOLL_RESULT_LABELS: Record<MatchkollResult, string> = {
  eligible: 'Du uppfyller kraven',
  likely_eligible: 'Du uppfyller troligen kraven',
  missing_info: 'Uppgifter saknas',
  not_eligible: 'Du uppfyller inte kraven',
}
