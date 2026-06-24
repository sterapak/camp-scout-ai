import { askQuestion, AskApiError } from './askClient.js'

describe('askClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('posts question and campgroundId to /api/ask', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        answer: 'Store food in bear lockers.',
        citations: [],
        model: 'gpt-4o-mini',
      }),
    })

    const result = await askQuestion({
      question: '  What are the bear rules?  ',
      campgroundId: 'yosemite-upper-pines',
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What are the bear rules?',
        campgroundId: 'yosemite-upper-pines',
      }),
    })
    expect(result).toEqual({
      status: 'success',
      answer: 'Store food in bear lockers.',
      citations: [],
      model: 'gpt-4o-mini',
    })
  })

  it('includes documentType when provided', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        answer: 'Rules apply.',
        citations: [],
        model: 'gpt-4o-mini',
      }),
    })

    await askQuestion({
      question: 'What are the rules?',
      campgroundId: 'yosemite-upper-pines',
      documentType: 'rules',
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What are the rules?',
        campgroundId: 'yosemite-upper-pines',
        documentType: 'rules',
      }),
    })
  })

  it('omits empty optional filters from the request body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'insufficient_context',
        message: 'No matching documents.',
        citations: [],
      }),
    })

    const result = await askQuestion({ question: 'Any alerts?' })

    expect(global.fetch).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Any alerts?' }),
    })
    expect(result.status).toBe('insufficient_context')
  })

  it('throws AskApiError with server error message on failed responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'Answer generation failed. Please try again.' }),
    })

    await expect(askQuestion({ question: 'What are the rules?' })).rejects.toEqual(
      new AskApiError('Answer generation failed. Please try again.', 502)
    )
  })

  it('throws AskApiError when fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    await expect(askQuestion({ question: 'What are the rules?' })).rejects.toEqual(
      new AskApiError('Unable to reach the answer service. Please try again.', 0)
    )
  })

  it('throws AskApiError when response JSON is invalid', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      },
    })

    await expect(askQuestion({ question: 'What are the rules?' })).rejects.toEqual(
      new AskApiError('Received an invalid response from the answer service.', 200)
    )
  })
})
