/** @jest-environment node */

import { MissingOpenAiApiKeyError, OpenAiResponseError } from './errors.js'
import {
  createOpenAiAnswerProvider,
  extractOutputText,
  OPENAI_API_KEY_ENV,
  readJsonResponseBody,
  resolveOpenAiApiKey,
  resolveOpenAiBaseUrl,
} from './openAiResponsesClient.js'

function createMockFetchResponse(body, { ok = true, status = 200 } = {}) {
  const rawBody = JSON.stringify(body)

  return {
    ok,
    status,
    async json() {
      return JSON.parse(rawBody)
    },
    async text() {
      return rawBody
    },
  }
}

describe('resolveOpenAiApiKey', () => {
  const originalKey = process.env[OPENAI_API_KEY_ENV]

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env[OPENAI_API_KEY_ENV]
    } else {
      process.env[OPENAI_API_KEY_ENV] = originalKey
    }
  })

  it('returns an explicit key when provided', () => {
    expect(resolveOpenAiApiKey(' explicit-key ')).toBe('explicit-key')
  })

  it('reads OPENAI_API_KEY from the environment', () => {
    process.env[OPENAI_API_KEY_ENV] = 'env-key'
    expect(resolveOpenAiApiKey()).toBe('env-key')
  })

  it('throws a clear error when the API key is missing', () => {
    delete process.env[OPENAI_API_KEY_ENV]

    expect(() => resolveOpenAiApiKey()).toThrow(MissingOpenAiApiKeyError)
    expect(() => resolveOpenAiApiKey()).toThrow(/OPENAI_API_KEY is not configured/)
  })

  it('throws when the API key is blank', () => {
    process.env[OPENAI_API_KEY_ENV] = '   '
    expect(() => resolveOpenAiApiKey()).toThrow(MissingOpenAiApiKeyError)
  })
})

describe('resolveOpenAiBaseUrl', () => {
  it('defaults to the OpenAI API base URL', () => {
    expect(resolveOpenAiBaseUrl()).toBe('https://api.openai.com/v1')
  })

  it('trims trailing slashes from custom base URLs', () => {
    expect(resolveOpenAiBaseUrl('https://example.test/v1/')).toBe('https://example.test/v1')
  })
})

describe('readJsonResponseBody', () => {
  it('reads JSON from mock fetch responses with text()', async () => {
    const response = createMockFetchResponse(
      { error: { message: 'bad key', code: 'invalid_api_key' } },
      { ok: false, status: 401 },
    )

    await expect(readJsonResponseBody(response)).resolves.toEqual({
      error: { message: 'bad key', code: 'invalid_api_key' },
    })
  })

  it('reads JSON through the same fetch mock used by generateAnswer', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createMockFetchResponse(
      { error: { message: 'bad key', code: 'invalid_api_key' } },
      { ok: false, status: 401 },
    ))

    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer bad-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: 'Question',
        max_output_tokens: 800,
        store: false,
      }),
    })

    await expect(readJsonResponseBody(response)).resolves.toEqual({
      error: { message: 'bad key', code: 'invalid_api_key' },
    })
  })
})

describe('extractOutputText', () => {
  it('prefers output_text when present', () => {
    expect(extractOutputText({ output_text: 'Direct answer' })).toBe('Direct answer')
  })

  it('extracts text from typed output items', () => {
    const payload = {
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: 'Grounded answer' },
          ],
        },
      ],
    }

    expect(extractOutputText(payload)).toBe('Grounded answer')
  })
})

describe('createOpenAiAnswerProvider', () => {
  it('calls the Responses API with server-side auth and parses the answer', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createMockFetchResponse({
      id: 'resp_test_123',
      model: 'gpt-4o-mini',
      output_text: 'Dogs are allowed on leash.',
      usage: {
        input_tokens: 120,
        output_tokens: 18,
      },
    }))

    const provider = createOpenAiAnswerProvider({
      apiKey: 'test-key',
      fetchImpl,
    })

    const result = await provider.generateAnswer({
      instructions: 'Answer from provided context only.',
      input: 'Are dogs allowed?',
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, requestInit] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(requestInit.method).toBe('POST')
    expect(requestInit.headers.Authorization).toBe('Bearer test-key')

    const requestBody = JSON.parse(requestInit.body)
    expect(requestBody.model).toBe('gpt-4o-mini')
    expect(requestBody.input).toBe('Are dogs allowed?')
    expect(requestBody.instructions).toBe('Answer from provided context only.')
    expect(requestBody.max_output_tokens).toBeGreaterThan(0)
    expect(requestBody.store).toBe(false)

    expect(result.text).toBe('Dogs are allowed on leash.')
    expect(result.model).toBe('gpt-4o-mini')
    expect(result.inputTokens).toBe(120)
    expect(result.outputTokens).toBe(18)
    expect(result.responseId).toBe('resp_test_123')
  })

  it('fails safely when the API key is missing', async () => {
    const provider = createOpenAiAnswerProvider({
      fetchImpl: jest.fn(),
    })

    await expect(provider.generateAnswer({ input: 'Question' }))
      .rejects
      .toThrow(MissingOpenAiApiKeyError)
  })

  it('rejects empty input before calling OpenAI', async () => {
    const fetchImpl = jest.fn()
    const provider = createOpenAiAnswerProvider({
      apiKey: 'test-key',
      fetchImpl,
    })

    await expect(provider.generateAnswer({ input: '   ' }))
      .rejects
      .toThrow(OpenAiResponseError)

    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
