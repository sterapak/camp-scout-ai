/** @jest-environment node */
import { emailConfigured, sendEmail } from './emailSender.js'

describe('emailSender (Resend)', () => {
  it('is inert without an API key', () => {
    expect(emailConfigured({})).toBe(false)
    expect(emailConfigured({ apiKey: 're_x' })).toBe(true)
  })

  it('POSTs to Resend with from/to/subject/text', async () => {
    let captured: any = null
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, body: JSON.parse(String(init.body)), auth: (init.headers as any).Authorization }
      return { ok: true, status: 200, json: async () => ({ id: 'em_1' }) }
    }) as unknown as typeof fetch

    const res = await sendEmail('you@example.com', 'Subj', 'Body text', {
      apiKey: 're_test',
      from: 'Camp Scout <onboarding@resend.dev>',
      fetchImpl,
    })
    expect(res.ok).toBe(true)
    expect(res.id).toBe('em_1')
    expect(captured.url).toBe('https://api.resend.com/emails')
    expect(captured.auth).toBe('Bearer re_test')
    expect(captured.body).toMatchObject({ to: 'you@example.com', subject: 'Subj', text: 'Body text' })
  })

  it('returns not-ok without a recipient or on API error', async () => {
    expect((await sendEmail('', 's', 'b', { apiKey: 're_x' })).ok).toBe(false)
    const failing = (async () => ({ ok: false, status: 422, json: async () => ({ message: 'bad' }) })) as unknown as typeof fetch
    const res = await sendEmail('a@b.com', 's', 'b', { apiKey: 're_x', fetchImpl: failing })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('bad')
  })
})
