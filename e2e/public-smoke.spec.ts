import { expect, test } from '@playwright/test'

/**
 * Public smoke paths — no credentials required. Verifies that the core
 * public surfaces render their Swedish content and that navigation between
 * them works.
 */

test.describe('Publika sidor', () => {
  test('startsidan renderar hero och sökvägar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Vägen till ditt nästa hem')
    await expect(page.getByRole('link', { name: /Hitta hyresbostad/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ställ dig i kön gratis/i })).toBeVisible()
  })

  test('hyressidan visar hyresmarknaden', async ({ page }) => {
    await page.goto('/rent')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hyra bostad')
  })

  test('söksidan visar filter och träffräknare', async ({ page }) => {
    await page.goto('/listings')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sök bostäder')
    await expect(page.getByText(/träffar/)).toBeVisible()
  })

  test('söksidan accepterar filterparametrar', async ({ page }) => {
    await page.goto('/listings?mode=rent&city=Stockholm&minRooms=2')
    await expect(page.getByText(/aktiva filter/)).toBeVisible()
  })

  test('bostadskön beskriver kostnadsfri kö', async ({ page }) => {
    await page.goto('/bostadsko')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('body')).toContainText(/kostnadsfri/i)
  })

  test('landningssidor för plus, byta och hyresvärdar renderar', async ({ page }) => {
    for (const path of ['/plus', '/byta', '/hyresvardar']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('juridiska sidor visar version', async ({ page }) => {
    for (const path of ['/terms', '/privacy', '/cookies', '/advertiser-terms']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('body')).toContainText('2026-05-09')
    }
  })

  test('robots och sitemap svarar', async ({ request }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
  })

  test('startsidan fungerar på mobil @mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
