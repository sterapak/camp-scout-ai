/**
 * Stripe server configuration — secret keys and price IDs stay server-side only.
 */

export const STRIPE_SECRET_KEY_ENV = 'STRIPE_SECRET_KEY'
export const STRIPE_PUBLISHABLE_KEY_ENV = 'STRIPE_PUBLISHABLE_KEY'
export const STRIPE_PRICE_5_ENV = 'STRIPE_PRICE_5'
export const STRIPE_PRICE_10_ENV = 'STRIPE_PRICE_10'
export const STRIPE_PRICE_25_ENV = 'STRIPE_PRICE_25'
export const APP_URL_ENV = 'APP_URL'

export const DONATION_AMOUNTS = [5, 10, 25] as const
export type DonationAmount = (typeof DONATION_AMOUNTS)[number]

const PRICE_ID_ENV_BY_AMOUNT: Record<DonationAmount, string> = {
  5: STRIPE_PRICE_5_ENV,
  10: STRIPE_PRICE_10_ENV,
  25: STRIPE_PRICE_25_ENV,
}

export function resolveStripeSecretKey(): string | undefined {
  const value = process.env[STRIPE_SECRET_KEY_ENV]?.trim()
  return value || undefined
}

export function resolvePriceIdForAmount(amount: DonationAmount): string | undefined {
  const envKey = PRICE_ID_ENV_BY_AMOUNT[amount]
  const value = process.env[envKey]?.trim()
  return value || undefined
}

export function resolveCheckoutBaseUrl(requestOrigin?: string): string | undefined {
  const configured = process.env[APP_URL_ENV]?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (requestOrigin?.trim()) {
    return requestOrigin.trim().replace(/\/$/, '')
  }

  return undefined
}

export function isDonationAmount(value: unknown): value is DonationAmount {
  return typeof value === 'number' && DONATION_AMOUNTS.includes(value as DonationAmount)
}
