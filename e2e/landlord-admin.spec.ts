import { expect, test } from '@playwright/test'
import { getAccount, signIn } from './helpers'

/**
 * Landlord workspace + admin panel journeys. Requires seeded accounts
 * (scripts/seed-e2e.mjs); skipped without E2E_LANDLORD_* / E2E_ADMIN_* vars.
 */

const landlord = getAccount('E2E_LANDLORD')
const admin = getAccount('E2E_ADMIN')

test.describe('Hyresvärdsarbetsytan', () => {
  test.skip(!landlord, 'E2E_LANDLORD_EMAIL/PASSWORD är inte konfigurerade')

  test('översikten visar nyckeltal', async ({ page }) => {
    await signIn(page, landlord!)
    await page.goto('/landlord')
    await expect(page.getByText('Bovaro för hyresvärdar')).toBeVisible()
  })

  test('analysmodulen visar aggregerad statistik', async ({ page }) => {
    await signIn(page, landlord!)
    await page.goto('/landlord/analytics')
    await expect(page.getByText('Sidvisningar', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Exportera CSV/i })).toBeVisible()
  })
})

test.describe('Adminpanelen', () => {
  test.skip(!admin, 'E2E_ADMIN_EMAIL/PASSWORD är inte konfigurerade')

  test('adminöversikten visar plattformsstatistik', async ({ page }) => {
    await signIn(page, admin!)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Adminöversikt')
  })

  test('supportläget kräver motivering', async ({ page }) => {
    await signIn(page, admin!)
    await page.goto('/admin/support')
    await expect(page.getByText(/tidsbegränsad/i).first()).toBeVisible()
  })

  test('GDPR-ärenden och riskflaggor renderar', async ({ page }) => {
    await signIn(page, admin!)
    await page.goto('/admin/privacy')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('GDPR')
    await page.goto('/admin/risk')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Riskflaggor')
  })
})
