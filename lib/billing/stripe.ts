import Stripe from 'stripe'

/**
 * Stripe client factory. Returns null when STRIPE_SECRET_KEY is not
 * configured — billing UI then shows an honest "inte konfigurerad" state and
 * no checkout can be started.
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

export function isStripeConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY)
}
