/** @jest-environment node */
import { sendSms, toE164 } from './twilioSmsSender.js'

describe('toE164', () => {
  it('prepends +1 to a bare 10-digit US number', () => {
    expect(toE164('7605095350')).toBe('+17605095350')
  })
  it('handles formatted input', () => {
    expect(toE164('(760) 509-5350')).toBe('+17605095350')
  })
  it('adds + to an 11-digit number starting with 1', () => {
    expect(toE164('17605095350')).toBe('+17605095350')
  })
  it('keeps an already-E.164 number', () => {
    expect(toE164('+17605095350')).toBe('+17605095350')
  })
  it('returns empty for blank input', () => {
    expect(toE164('')).toBe('')
    expect(toE164('   ')).toBe('')
  })
})

describe('sendSms', () => {
  const deps = { accountSid: 'ACtest', authToken: 'tok', fromNumber: '+15559990000' }

  it('normalizes the recipient to E.164 before calling Twilio', async () => {
    let sentBody = ''
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentBody = String(init.body)
      return { ok: true, status: 201, json: async () => ({ sid: 'SM1', status: 'queued' }) }
    }) as unknown as typeof fetch

    const res = await sendSms('7605095350', 'hi', { ...deps, fetchImpl })
    expect(res.ok).toBe(true)
    expect(res.messageStatus).toBe('queued')
    expect(decodeURIComponent(sentBody)).toContain('To=+17605095350')
  })

  it('fails when the recipient is unusable', async () => {
    const res = await sendSms('', 'hi', deps)
    expect(res.ok).toBe(false)
  })

  it('sends via the Messaging Service (A2P) when a SID is set, not a raw From', async () => {
    let sentBody = ''
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentBody = String(init.body)
      return { ok: true, status: 201, json: async () => ({ sid: 'SM2', status: 'accepted' }) }
    }) as unknown as typeof fetch

    const res = await sendSms('+17605095350', 'hi', {
      accountSid: 'ACtest',
      authToken: 'tok',
      messagingServiceSid: 'MGabc123',
      fetchImpl,
    })
    expect(res.ok).toBe(true)
    const decoded = decodeURIComponent(sentBody)
    expect(decoded).toContain('MessagingServiceSid=MGabc123')
    expect(decoded).not.toContain('From=')
  })
})
