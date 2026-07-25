import { defineConfig, devices } from '@playwright/test'

/**
 * E2E configuration.
 *
 * - The `public` project runs without any credentials: smoke tests of the
 *   public marketplace, legal pages and auth guards.
 * - The `authenticated` project (seeker/landlord/admin journeys) requires
 *   seeded test accounts (see scripts/seed-e2e.mjs) exposed via
 *   E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD etc. Specs skip themselves when
 *   the variables are missing, so a bare `npx playwright test` is always green.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    locale: 'sv-SE',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: 'npm run start -- -H 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
