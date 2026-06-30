/**
 * Donation handler — validates amount and creates a Stripe Checkout Session.
 * Server-only; never import from React client code.
 */

import Stripe from 'stripe'

import type { ApiErrorResponse } from '../../shared/types/api.js'
import {
  isDonationAmount,
  resolveCheckoutBaseUrl,
  resolvePriceIdForAmount,
  resolveStripeSecretKey,
  type DonationAmount,
} from '../stripe/stripeConfig.js'

export const INVALID_DONATE_BODY_ERROR =
  'Request body must be a JSON object with an amount field of 5, 10, or 25.'
export const DONATIONS_NOT_CONFIGURED_ERROR = 'Donations are not configured yet.'
export const CHECKOUT_BASE_URL_ERROR = 'Unable to determine checkout redirect URL.'

export type DonateValidationFailure = {
  ok: false
  statusCode: number
  body: ApiErrorResponse
}

export type DonateValidationSuccess = {
  ok: true
  value: { amount: DonationAmount }
}

export type DonateValidationResult = DonateValidationSuccess | DonateValidationFailure

export interface DonateHttpResponse {
  statusCode: number
  body: { url: string } | ApiErrorResponse
}

export interface DonateHandlerOptions {
  requestOrigin?: string
  stripeClient?: Stripe
}

export function validateDonateRequestBody(body: unknown): DonateValidationResult {
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: INVALID_DONATE_BODY_ERROR },
    }
  }

  const { amount } = body as Record<string, unknown>

  if (!isDonationAmount(amount)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: INVALID_DONATE_BODY_ERROR },
    }
  }

  return { ok: true, value: { amount } }
}

export async function handleDonateRequest(
  body: unknown,
  options: DonateHandlerOptions = {},
): Promise<DonateHttpResponse> {
  const validation = validateDonateRequestBody(body)
  if (validation.ok === false) {
    return {
      statusCode: validation.statusCode,
      body: validation.body,
    }
  }

  const secretKey = resolveStripeSecretKey()
  const priceId = resolvePriceIdForAmount(validation.value.amount)
  const baseUrl = resolveCheckoutBaseUrl(options.requestOrigin)

  if (!secretKey || !priceId) {
    return {
      statusCode: 503,
      body: { error: DONATIONS_NOT_CONFIGURED_ERROR },
    }
  }

  if (!baseUrl) {
    return {
      statusCode: 500,
      body: { error: CHECKOUT_BASE_URL_ERROR },
    }
  }

  const stripe = options.stripeClient ?? new Stripe(secretKey)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donation-cancel`,
    })

    if (!session.url) {
      return {
        statusCode: 500,
        body: { error: 'Failed to create checkout session.' },
      }
    }

    return {
      statusCode: 200,
      body: { url: session.url },
    }
  } catch {
    return {
      statusCode: 502,
      body: { error: 'Payment provider request failed. Please try again.' },
    }
  }
}
