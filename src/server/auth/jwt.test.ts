/** @jest-environment node */
import { signSession, verifySession } from './jwt.js'

const SECRET = 'test-secret-at-least-16-chars-long'

describe('session jwt (HS256)', () => {
  const prev = process.env.SESSION_SECRET
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET
  })
  afterAll(() => {
    if (prev === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = prev
  })

  it('round-trips a signed session', () => {
    const token = signSession({ uid: 'u1', email: 'a@b.com', name: 'Ada' })
    const v = verifySession(token)
    expect(v?.uid).toBe('u1')
    expect(v?.email).toBe('a@b.com')
    expect(v?.name).toBe('Ada')
  })

  it('rejects a tampered payload (signature no longer matches)', () => {
    const token = signSession({ uid: 'u1', email: 'a@b.com' })
    const [header, , sig] = token.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ uid: 'attacker', email: 'x@y.com', exp: Math.floor(Date.now() / 1000) + 1000 }),
    ).toString('base64url')
    expect(verifySession(`${header}.${forgedBody}.${sig}`)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signSession({ uid: 'u1', email: 'a@b.com' }, -10)
    expect(verifySession(token)).toBeNull()
  })

  it('rejects malformed / missing tokens without throwing', () => {
    expect(verifySession(undefined)).toBeNull()
    expect(verifySession(null)).toBeNull()
    expect(verifySession('')).toBeNull()
    expect(verifySession('only.two')).toBeNull()
    expect(verifySession('a.b.c')).toBeNull()
  })

  it('rejects a token after the secret rotates (revocation kill-switch)', () => {
    const token = signSession({ uid: 'u1', email: 'a@b.com' })
    process.env.SESSION_SECRET = 'a-completely-different-secret-value'
    expect(verifySession(token)).toBeNull()
  })
})
