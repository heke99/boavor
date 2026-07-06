import { expect, test } from '@playwright/test'
import { getAccount, signIn } from './helpers'

/**
 * Support desk: seeker opens a ticket, admin answers with SLA tracking.
 * Requires seeded E2E accounts; skipped without them.
 */

const seeker = getAccount('E2E_SEEKER')
const admin = getAccount('E2E_ADMIN')

test.describe('Supportärenden', () => {
  test.skip(!seeker || !admin, 'E2E-konton är inte konfigurerade')

  test('sökande skapar ärende och admin svarar', async ({ page }) => {
    const subject = `E2E-ärende ${Date.now()}`

    await signIn(page, seeker!)
    await page.goto('/dashboard/support')
    await page.getByPlaceholder('Kort beskrivning av problemet').fill(subject)
    await page.getByPlaceholder('Beskriv vad som hänt och vad du förväntade dig.').fill('Detta är ett automatiskt testärende.')
    await page.getByRole('button', { name: 'Skicka ärende' }).click()
    await expect(page).toHaveURL(/\/dashboard\/support\//)
    await expect(page.getByText('Detta är ett automatiskt testärende.')).toBeVisible()

    // Admin side: the ticket appears with SLA badge and can be answered.
    await page.context().clearCookies()
    await signIn(page, admin!)
    await page.goto('/admin/support-desk')
    await expect(page.getByText(subject)).toBeVisible()
    await page.getByText(subject).click()
    await page.getByPlaceholder(/Skriv ett svar/).fill('Hej! Detta är ett automatiskt svar från supporten.')
    await page.getByRole('button', { name: 'Skicka svar' }).click()
    await expect(page.getByText('Hej! Detta är ett automatiskt svar från supporten.')).toBeVisible()
  })
})
