import { expect, test } from '@playwright/test'

/**
 * Server-side access guards: signed-out visitors must never see protected
 * workspaces. These run without credentials and assert the redirect target.
 */

const protectedPaths = [
  { path: '/dashboard', description: 'sökande-dashboard' },
  { path: '/dashboard/identity', description: 'identitetssida' },
  { path: '/dashboard/applications', description: 'ansökningar' },
  { path: '/landlord', description: 'hyresvärdsarbetsyta' },
  { path: '/admin', description: 'adminpanel' },
  { path: '/admin/support', description: 'supportläge' },
  { path: '/admin/settings', description: 'plattformsinställningar' },
]

test.describe('Åtkomstskydd', () => {
  for (const { path, description } of protectedPaths) {
    test(`utloggad besökare på ${description} (${path}) skickas till inloggning`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('cron-endpoints kräver hemlighet', async ({ request }) => {
    const response = await request.get('/api/cron/award-queue-points')
    expect([401, 403, 503]).toContain(response.status())
  })

  test('dataexport kräver inloggning', async ({ request }) => {
    const response = await request.get('/dashboard/settings/export', { maxRedirects: 0 })
    // Without Supabase environment configuration the route fails closed with
    // 503; it must never expose an export to the anonymous caller.
    expect([302, 307, 401, 503]).toContain(response.status())
  })
})
