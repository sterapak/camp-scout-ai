import { SummaryApiError, postSummary } from './summaryClient'

describe('postSummary', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    window.__CAMP_SCOUT_RUNTIME__ = { apiToken: 'test-api-token' }
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete window.__CAMP_SCOUT_RUNTIME__
  })

  it('posts campgroundId to /api/summary with Authorization header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        sections: { overview: ['Overview text.'] },
        citations: [],
        model: 'gpt-4o-mini',
      }),
    })

    const result = await postSummary({ campgroundId: '  yosemite-upper-pines  ' })

    expect(global.fetch).toHaveBeenCalledWith('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-token',
      },
      body: JSON.stringify({ campgroundId: 'yosemite-upper-pines' }),
    })
    expect(result.status).toBe('success')
  })

  it('throws SummaryApiError for non-OK responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized.' }),
    })

    await expect(postSummary({ campgroundId: 'yosemite-upper-pines' })).rejects.toMatchObject({
      name: 'SummaryApiError',
      message: 'Unauthorized.',
      statusCode: 401,
    })
  })
})

describe('SummaryApiError', () => {
  it('stores the status code', () => {
    const error = new SummaryApiError('Unauthorized.', 401)
    expect(error).toBeInstanceOf(Error)
    expect(error.statusCode).toBe(401)
  })
})
