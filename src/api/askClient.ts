import type { AskRequest, AskResponse } from '../shared/types/api.js'

export const ASK_API_PATH = '/api/ask'

export class AskApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'AskApiError'
    this.statusCode = statusCode
  }
}

export type AskCitation = import('../shared/types/api.js').Citation
export type AskApiResult = AskResponse

export async function postAsk(params: Pick<AskRequest, 'question' | 'campgroundId'>): Promise<AskApiResult> {
  const body: AskRequest = { question: params.question.trim() }

  if (params.campgroundId) {
    body.campgroundId = params.campgroundId
  }

  const response = await fetch(ASK_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as AskApiResult | { error?: string }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed.'
    throw new AskApiError(message, response.status)
  }

  return data as AskApiResult
}
