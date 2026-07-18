/** @jest-environment node */
import { pushoverConfigured, sendPushover } from './pushoverSender.js'

describe('pushoverSender', () => {
  it('is inert unless both app token and user key are present', () => {
    expect(pushoverConfigured({})).toBe(false)
    expect(pushoverConfigured({ appToken: 't' })).toBe(false)
    expect(pushoverConfigured({ appToken: 't', userKey: 'u' })).toBe(true)
  })

  it('POSTs token/user/message (+title/url) to the Pushover API', async () => {
    let body = ''
    const fetchImpl = (async (url: string, init: RequestInit) => {
      expect(url).toBe('https://api.pushover.net/1/messages.json')
      body = String(init.body)
      return { ok: true, status: 200, json: async () => ({ status: 1, request: 'r1' }) }
    }) as unknown as typeof fetch

    const res = await sendPushover('A spot freed', { title: 'Upper Pines', url: 'https://recreation.gov/x' }, {
      appToken: 'apptok',
      userKey: 'userkey',
      fetchImpl,
    })
    expect(res.ok).toBe(true)
    const decoded = decodeURIComponent(body)
    expect(decoded).toContain('token=apptok')
    expect(decoded).toContain('user=userkey')
    expect(decoded).toContain('message=A+spot+freed')
    expect(decoded).toContain('title=Upper+Pines')
  })

  it('treats a non-1 status as failure', async () => {
    const fetchImpl = (async () => ({
      ok: false,
      status: 400,
      json: async () => ({ status: 0, errors: ['user key is invalid'] }),
    })) as unknown as typeof fetch
    const res = await sendPushover('x', {}, { appToken: 't', userKey: 'u', fetchImpl })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('user key is invalid')
  })
})
