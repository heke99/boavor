import { expect, type Page } from '@playwright/test'

export type TestAccount = {
  email: string
  password: string
}

/** Reads a seeded E2E account from the environment; null when not configured. */
export function getAccount(prefix: 'E2E_SEEKER' | 'E2E_LANDLORD' | 'E2E_ADMIN'): TestAccount | null {
  const email = process.env[`${prefix}_EMAIL`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (!email || !password) return null
  return { email, password }
}

export async function signIn(page: Page, account: TestAccount) {
  await page.goto('/login')
  await page.getByPlaceholder('din@email.se').fill(account.email)
  await page.getByPlaceholder('••••••••').fill(account.password)
  await page.getByRole('button', { name: /^Logga in$/ }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}
