import { DonateApiError, postDonate } from './donateClient'

describe('postDonate', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('returns checkout URL on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://checkout.stripe.com/test' }),
    })

    const result = await postDonate(10)

    expect(result).toEqual({ url: 'https://checkout.stripe.com/test' })
    expect(global.fetch).toHaveBeenCalledWith('/api/donate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10 }),
    })
  })

  it('throws DonateApiError with server message on failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Donations are not configured yet.' }),
    })

    await expect(postDonate(5)).rejects.toEqual(
      new DonateApiError('Donations are not configured yet.', 503),
    )
  })

  it('throws when response is missing checkout URL', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await expect(postDonate(25)).rejects.toEqual(
      new DonateApiError('Invalid checkout response.', 200),
    )
  })
})
