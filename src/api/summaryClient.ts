import type { SummaryRequest, SummaryResponse } from '../shared/types/api.js'

export const SUMMARY_API_PATH = '/api/summary'

export class SummaryApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'SummaryApiError'
    this.statusCode = statusCode
  }
}

export type SummaryApiResult = SummaryResponse

export async function postSummary(params: Pick<SummaryRequest, 'campgroundId'>): Promise<SummaryApiResult> {
  const response = await fetch(SUMMARY_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campgroundId: params.campgroundId.trim() } satisfies SummaryRequest),
  })

  const data = (await response.json()) as SummaryApiResult | { error?: string }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed.'
    throw new SummaryApiError(message, response.status)
  }

  return data as SummaryApiResult
}
