/** @jest-environment node */
import { isEmailAllowed } from './authRoutes.js'

describe('isEmailAllowed', () => {
  const prev = process.env.ALLOWED_EMAILS
  afterEach(() => {
    if (prev === undefined) delete process.env.ALLOWED_EMAILS
    else process.env.ALLOWED_EMAILS = prev
  })

  it('allows everyone when no allowlist is set (public)', () => {
    delete process.env.ALLOWED_EMAILS
    expect(isEmailAllowed('anyone@example.com')).toBe(true)
  })

  it('permits only listed emails (case-insensitive) when set', () => {
    process.env.ALLOWED_EMAILS = 'steve@terapak.com, other@x.com'
    expect(isEmailAllowed('steve@terapak.com')).toBe(true)
    expect(isEmailAllowed('STEVE@Terapak.com')).toBe(true)
    expect(isEmailAllowed('other@x.com')).toBe(true)
    expect(isEmailAllowed('stranger@gmail.com')).toBe(false)
    expect(isEmailAllowed('')).toBe(false)
    expect(isEmailAllowed(null)).toBe(false)
  })
})
