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

  test('importcentret klarar hela cykeln: testkörning, import och återställning', async ({ page }) => {
    await signIn(page, landlord!)
    await page.goto('/landlord/import')

    const projectName = `E2E-import ${Date.now()}`
    await page.getByPlaceholder('T.ex. Flytt från Vitec 2026').fill(projectName)
    await page
      .locator('textarea[name="csv"]')
      .fill('Fastighet;Adress;Stad;Lägenhetsnummer;Rum;Kvm;Hyra\nE2E Björken;Storgatan 1;Umeå;9001;2;55;8500\nE2E Björken;Storgatan 1;Umeå;9002;3;72;10200')
    await page.getByRole('button', { name: 'Skapa projekt' }).click()
    await expect(page).toHaveURL(/\/landlord\/import\//)

    await page.getByRole('button', { name: 'Kör testimport' }).click()
    await expect(page.getByText('Testkörningen är klar')).toBeVisible()

    await page.getByRole('button', { name: 'Importera på riktigt' }).click()
    await expect(page.getByText('Importen är klar')).toBeVisible()

    await page.getByRole('button', { name: 'Återställ importen' }).click()
    await expect(page.getByText('Importen har återställts')).toBeVisible()
  })

  test('importcentret avvisar filer med hyresgästuppgifter (integritetsspärr)', async ({ page }) => {
    await signIn(page, landlord!)
    await page.goto('/landlord/import')

    await page.getByPlaceholder('T.ex. Flytt från Vitec 2026').fill('E2E PII-test')
    await page
      .locator('textarea[name="csv"]')
      .fill('Fastighet;Lägenhetsnummer;Hyresgäst namn;Personnummer\nA;1;Anna;19900101-1234')
    await page.getByRole('button', { name: 'Skapa projekt' }).click()
    await expect(page.getByText(/personuppgifter om hyresgäster/)).toBeVisible()
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
