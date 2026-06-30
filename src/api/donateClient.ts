export const DONATE_API_PATH = '/api/donate'

export class DonateApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'DonateApiError'
    this.statusCode = statusCode
  }
}

export type DonationAmount = 5 | 10 | 25

export async function postDonate(amount: DonationAmount): Promise<{ url: string }> {
  const response = await fetch(DONATE_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })

  const data = (await response.json()) as { url?: string; error?: string }

  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? data.error : 'Donation request failed.'
    throw new DonateApiError(message, response.status)
  }

  if (typeof data.url !== 'string' || data.url.length === 0) {
    throw new DonateApiError('Invalid checkout response.', response.status)
  }

  return { url: data.url }
}
