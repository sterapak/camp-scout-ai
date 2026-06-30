/** @jest-environment node */

import {
  CHECKOUT_BASE_URL_ERROR,
  DONATIONS_NOT_CONFIGURED_ERROR,
  INVALID_DONATE_BODY_ERROR,
  handleDonateRequest,
  validateDonateRequestBody,
} from './donateHandler.js'
import {
  CAMP_SCOUT_PUBLIC_URL_ENV,
  STRIPE_PRICE_ID_10_ENV,
  STRIPE_PRICE_ID_25_ENV,
  STRIPE_PRICE_ID_5_ENV,
  STRIPE_SECRET_KEY_ENV,
} from '../stripe/stripeConfig.js'

const ORIGINAL_ENV = process.env

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV }
}

describe('validateDonateRequestBody', () => {
  it('accepts valid donation amounts', () => {
    expect(validateDonateRequestBody({ amount: 5 })).toEqual({ ok: true, value: { amount: 5 } })
    expect(validateDonateRequestBody({ amount: 10 })).toEqual({ ok: true, value: { amount: 10 } })
    expect(validateDonateRequestBody({ amount: 25 })).toEqual({ ok: true, value: { amount: 25 } })
  })

  it('rejects invalid bodies', () => {
    expect(validateDonateRequestBody(null).body.error).toBe(INVALID_DONATE_BODY_ERROR)
    expect(validateDonateRequestBody({ amount: 15 }).body.error).toBe(INVALID_DONATE_BODY_ERROR)
    expect(validateDonateRequestBody({ amount: '5' }).body.error).toBe(INVALID_DONATE_BODY_ERROR)
    expect(validateDonateRequestBody([]).body.error).toBe(INVALID_DONATE_BODY_ERROR)
  })
})

describe('handleDonateRequest', () => {
  beforeEach(() => {
    restoreEnv()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns 503 when Stripe is not configured', async () => {
    delete process.env[STRIPE_SECRET_KEY_ENV]
    delete process.env[STRIPE_PRICE_ID_5_ENV]

    const response = await handleDonateRequest({ amount: 5 })

    expect(response.statusCode).toBe(503)
    expect(response.body.error).toBe(DONATIONS_NOT_CONFIGURED_ERROR)
  })

  it('returns 500 when checkout base URL cannot be resolved', async () => {
    process.env[STRIPE_SECRET_KEY_ENV] = 'sk_test_example'
    process.env[STRIPE_PRICE_ID_5_ENV] = 'price_5'
    delete process.env[CAMP_SCOUT_PUBLIC_URL_ENV]

    const response = await handleDonateRequest({ amount: 5 })

    expect(response.statusCode).toBe(500)
    expect(response.body.error).toBe(CHECKOUT_BASE_URL_ERROR)
  })

  it('creates a checkout session and returns the redirect URL', async () => {
    process.env[STRIPE_SECRET_KEY_ENV] = 'sk_test_example'
    process.env[STRIPE_PRICE_ID_10_ENV] = 'price_10'
    process.env[CAMP_SCOUT_PUBLIC_URL_ENV] = 'https://campscout.example.com'

    const stripeClient = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' }),
        },
      },
    }

    const response = await handleDonateRequest(
      { amount: 10 },
      { stripeClient },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ url: 'https://checkout.stripe.com/session_123' })
    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith({
      mode: 'payment',
      line_items: [{ price: 'price_10', quantity: 1 }],
      success_url:
        'https://campscout.example.com/donation-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://campscout.example.com/donation-cancel',
    })
  })

  it('maps each amount to the correct price ID', async () => {
    process.env[STRIPE_SECRET_KEY_ENV] = 'sk_test_example'
    process.env[STRIPE_PRICE_ID_5_ENV] = 'price_5'
    process.env[STRIPE_PRICE_ID_25_ENV] = 'price_25'
    process.env[CAMP_SCOUT_PUBLIC_URL_ENV] = 'https://campscout.example.com'

    const stripeClient = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_456' }),
        },
      },
    }

    await handleDonateRequest({ amount: 25 }, { stripeClient })

    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_25', quantity: 1 }],
      }),
    )
  })

  it('returns 502 when Stripe throws', async () => {
    process.env[STRIPE_SECRET_KEY_ENV] = 'sk_test_example'
    process.env[STRIPE_PRICE_ID_5_ENV] = 'price_5'
    process.env[CAMP_SCOUT_PUBLIC_URL_ENV] = 'https://campscout.example.com'

    const stripeClient = {
      checkout: {
        sessions: {
          create: jest.fn().mockRejectedValue(new Error('Stripe unavailable')),
        },
      },
    }

    const response = await handleDonateRequest({ amount: 5 }, { stripeClient })

    expect(response.statusCode).toBe(502)
    expect(response.body.error).toBe('Payment provider request failed. Please try again.')
  })

  it('uses request origin when public URL is not configured', async () => {
    process.env[STRIPE_SECRET_KEY_ENV] = 'sk_test_example'
    process.env[STRIPE_PRICE_ID_5_ENV] = 'price_5'
    delete process.env[CAMP_SCOUT_PUBLIC_URL_ENV]

    const stripeClient = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_789' }),
        },
      },
    }

    await handleDonateRequest(
      { amount: 5 },
      { requestOrigin: 'http://localhost:5173', stripeClient },
    )

    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'http://localhost:5173/donation-success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:5173/donation-cancel',
      }),
    )
  })
})
