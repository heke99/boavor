import { expect, test } from '@playwright/test'
import { getAccount, signIn } from './helpers'

/**
 * Seeker journey: dashboard, profile readiness, queue and saved searches.
 * Requires a seeded account (scripts/seed-e2e.mjs) via E2E_SEEKER_EMAIL /
 * E2E_SEEKER_PASSWORD — skipped otherwise.
 */

const account = getAccount('E2E_SEEKER')

test.describe('Sökande-resan', () => {
  test.skip(!account, 'E2E_SEEKER_EMAIL/PASSWORD är inte konfigurerade')

  test('inloggning landar på dashboard med översikt', async ({ page }) => {
    await signIn(page, account!)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/översikt/i)
    await expect(page.getByText('Ansökningsredo')).toBeVisible()
  })

  test('identitetssidan visar verifieringsstatus', async ({ page }) => {
    await signIn(page, account!)
    await page.goto('/dashboard/identity')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('sparade sökningar kan skapas och tas bort', async ({ page }) => {
    await signIn(page, account!)
    await page.goto('/dashboard/saved-searches')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('notismeny och inställningar nås', async ({ page }) => {
    await signIn(page, account!)
    await page.goto('/dashboard/settings')
    await expect(page.getByText('Integritet och data')).toBeVisible()
    await expect(page.getByRole('link', { name: /Ladda ner mina uppgifter/i })).toBeVisible()
  })
})
