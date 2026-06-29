import { AskApiError, postAsk } from './askClient'

describe('postAsk', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    window.__CAMP_SCOUT_RUNTIME__ = { apiToken: 'test-api-token' }
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete window.__CAMP_SCOUT_RUNTIME__
  })

  it('posts question and campgroundId to /api/ask', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        answer: 'Store food in bear boxes.',
        citations: [],
        model: 'gpt-4o-mini',
      }),
    })

    const result = await postAsk({
      question: '  What are the bear rules?  ',
      campgroundId: 'yosemite-upper-pines',
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-token',
      },
      body: JSON.stringify({
        question: 'What are the bear rules?',
        campgroundId: 'yosemite-upper-pines',
      }),
    })
    expect(result.status).toBe('success')
    expect(result.model).toBe('gpt-4o-mini')
  })

  it('omits campgroundId when not provided', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        answer: 'Answer',
        citations: [],
        model: 'gpt-4o-mini',
      }),
    })

    await postAsk({ question: 'What are the bear rules?' })

    expect(global.fetch).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-token',
      },
      body: JSON.stringify({ question: 'What are the bear rules?' }),
    })
  })

  it('throws AskApiError for non-OK responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'Answer generation failed. Please try again.' }),
    })

    await expect(postAsk({ question: 'What are the bear rules?' })).rejects.toMatchObject({
      name: 'AskApiError',
      message: 'Answer generation failed. Please try again.',
      statusCode: 502,
    })
  })
})

describe('AskApiError', () => {
  it('stores the status code', () => {
    const error = new AskApiError('Bad request', 400)
    expect(error).toBeInstanceOf(Error)
    expect(error.statusCode).toBe(400)
  })
})
