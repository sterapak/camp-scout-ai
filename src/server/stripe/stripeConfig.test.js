/** @jest-environment node */

import { APP_URL_ENV, resolveCheckoutBaseUrl } from './stripeConfig.js'

describe('resolveCheckoutBaseUrl (M6 — no attacker-controlled redirect base)', () => {
  const originalAppUrl = process.env[APP_URL_ENV]

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env[APP_URL_ENV]
    } else {
      process.env[APP_URL_ENV] = originalAppUrl
    }
  })

  it('uses the configured APP_URL and ignores the request Origin', () => {
    process.env[APP_URL_ENV] = 'https://campscout.terapak.com/'
    expect(resolveCheckoutBaseUrl('https://evil.example.com')).toBe(
      'https://campscout.terapak.com',
    )
  })

  it('rejects an arbitrary Origin when APP_URL is unset (fail closed)', () => {
    delete process.env[APP_URL_ENV]
    expect(resolveCheckoutBaseUrl('https://evil.example.com')).toBeUndefined()
  })

  it('still allows a localhost Origin for dev when APP_URL is unset', () => {
    delete process.env[APP_URL_ENV]
    expect(resolveCheckoutBaseUrl('http://localhost:5173')).toBe('http://localhost:5173')
    expect(resolveCheckoutBaseUrl('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173')
  })
})
