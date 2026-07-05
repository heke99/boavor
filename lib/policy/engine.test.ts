import { describe, expect, it } from 'vitest'
import {
  evaluatePolicy,
  rulesFromRentalRequirements,
  type ApplicantFacts,
  type PolicyRule,
} from './engine'

function facts(overrides: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    monthlyIncome: 35000,
    employmentType: 'employed',
    householdSize: 2,
    hasPets: false,
    smoking: false,
    isStudent: false,
    age: 34,
    hasGuarantor: false,
    documentTypes: ['income_proof'],
    screening: { hasActiveDebt: null },
    ...overrides,
  }
}

const RENT = 10000

describe('evaluatePolicy — income rules', () => {
  it('passes and fails min_income', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'min_income', config: { amount: 30000 } }
    expect(evaluatePolicy([rule], facts(), RENT).result).toBe('eligible')
    expect(evaluatePolicy([rule], facts({ monthlyIncome: 20000 }), RENT).result).toBe('not_eligible')
  })

  it('income multiplier uses the rent amount', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'income_multiplier', config: { multiplier: 3 } }
    expect(evaluatePolicy([rule], facts({ monthlyIncome: 30000 }), RENT).result).toBe('eligible')
    expect(evaluatePolicy([rule], facts({ monthlyIncome: 29999 }), RENT).result).toBe('not_eligible')
  })

  it('missing income yields missing_info', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'min_income', config: { amount: 30000 } }
    const evaluation = evaluatePolicy([rule], facts({ monthlyIncome: null }), RENT)
    expect(evaluation.result).toBe('missing_info')
  })
})

describe('evaluatePolicy — required documents', () => {
  it('flags missing documents', () => {
    const rule: PolicyRule = {
      id: '1',
      ruleType: 'required_documents',
      config: { types: ['income_proof', 'register_extract'] },
    }
    const evaluation = evaluatePolicy([rule], facts(), RENT)
    expect(evaluation.result).toBe('missing_info')
    expect(evaluation.outcomes[0].explanation).toContain('registerutdrag')
  })

  it('passes when all documents exist', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'required_documents', config: { types: ['income_proof'] } }
    expect(evaluatePolicy([rule], facts(), RENT).result).toBe('eligible')
  })
})

describe('evaluatePolicy — pets and smoking', () => {
  it('fails pets when not allowed and applicant has pets', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'pets_allowed', config: { allowed: false } }
    expect(evaluatePolicy([rule], facts({ hasPets: true }), RENT).result).toBe('not_eligible')
    expect(evaluatePolicy([rule], facts({ hasPets: false }), RENT).result).toBe('eligible')
  })

  it('fails smoking when not allowed and household smokes', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'smoking_allowed', config: { allowed: false } }
    expect(evaluatePolicy([rule], facts({ smoking: true }), RENT).result).toBe('not_eligible')
    expect(evaluatePolicy([rule], facts({ smoking: false }), RENT).result).toBe('eligible')
  })
})

describe('evaluatePolicy — student and senior rules', () => {
  it('student_only requires studying', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'student_only', config: {} }
    expect(evaluatePolicy([rule], facts({ isStudent: true }), RENT).result).toBe('eligible')
    expect(evaluatePolicy([rule], facts({ isStudent: false }), RENT).result).toBe('not_eligible')
  })

  it('senior_only checks verified age', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'senior_only', config: { min_age: 55 } }
    expect(evaluatePolicy([rule], facts({ age: 60 }), RENT).result).toBe('eligible')
    expect(evaluatePolicy([rule], facts({ age: 40 }), RENT).result).toBe('not_eligible')
    expect(evaluatePolicy([rule], facts({ age: null }), RENT).result).toBe('missing_info')
  })
})

describe('evaluatePolicy — screening', () => {
  it('is likely_eligible when screening cannot be verified', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'no_active_debt', config: {} }
    const evaluation = evaluatePolicy([rule], facts({ screening: { hasActiveDebt: null } }), RENT)
    expect(evaluation.result).toBe('likely_eligible')
    expect(evaluation.unverifiableCount).toBe(1)
  })

  it('fails with verified active debt and passes without', () => {
    const rule: PolicyRule = { id: '1', ruleType: 'no_active_debt', config: {} }
    expect(evaluatePolicy([rule], facts({ screening: { hasActiveDebt: true } }), RENT).result).toBe('not_eligible')
    expect(evaluatePolicy([rule], facts({ screening: { hasActiveDebt: false } }), RENT).result).toBe('eligible')
  })
})

describe('evaluatePolicy — result precedence', () => {
  it('failed beats missing and unverifiable', () => {
    const rules: PolicyRule[] = [
      { id: '1', ruleType: 'min_income', config: { amount: 99000 } },
      { id: '2', ruleType: 'required_documents', config: { types: ['register_extract'] } },
      { id: '3', ruleType: 'no_active_debt', config: {} },
    ]
    expect(evaluatePolicy(rules, facts(), RENT).result).toBe('not_eligible')
  })

  it('missing beats unverifiable', () => {
    const rules: PolicyRule[] = [
      { id: '1', ruleType: 'required_documents', config: { types: ['register_extract'] } },
      { id: '2', ruleType: 'no_active_debt', config: {} },
    ]
    expect(evaluatePolicy(rules, facts(), RENT).result).toBe('missing_info')
  })

  it('empty rule set is eligible', () => {
    expect(evaluatePolicy([], facts(), RENT).result).toBe('eligible')
  })
})

describe('rulesFromRentalRequirements', () => {
  it('derives rules from the legacy requirements shape', () => {
    const rules = rulesFromRentalRequirements({
      minIncome: 25000,
      petsAllowed: false,
      smokingAllowed: false,
      referencesRequired: true,
      employmentRequired: true,
    })

    const types = rules.map((rule) => rule.ruleType)
    expect(types).toEqual(
      expect.arrayContaining(['min_income', 'pets_allowed', 'smoking_allowed', 'accepted_employment_types', 'required_documents']),
    )

    const evaluation = evaluatePolicy(rules, facts({ documentTypes: ['reference'] }), RENT)
    expect(evaluation.result).toBe('eligible')
  })

  it('omits income rule when no minimum is set', () => {
    const rules = rulesFromRentalRequirements({
      minIncome: null,
      petsAllowed: true,
      smokingAllowed: true,
      referencesRequired: false,
      employmentRequired: false,
    })
    expect(rules.map((rule) => rule.ruleType)).not.toContain('min_income')
  })
})
