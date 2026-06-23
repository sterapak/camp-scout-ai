import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_MODEL,
  isAnswerProvider,
} from './answerProvider.js'
import { fakeAnswerProvider, createFakeAnswerProvider } from './fakeAnswerProvider.js'

describe('answerProvider interface', () => {
  it('defines the answer provider contract', () => {
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-4o-mini')
    expect(DEFAULT_MAX_OUTPUT_TOKENS).toBeGreaterThan(0)
    expect(isAnswerProvider(fakeAnswerProvider)).toBe(true)
    expect(fakeAnswerProvider.name).toBe('fake')
    expect(typeof fakeAnswerProvider.generateAnswer).toBe('function')
  })

  it('rejects invalid provider shapes', () => {
    expect(isAnswerProvider(null)).toBe(false)
    expect(isAnswerProvider({ name: 'fake' })).toBe(false)
    expect(isAnswerProvider({
      name: 'fake',
      generateAnswer: undefined,
    })).toBe(false)
  })
})

describe('fakeAnswerProvider', () => {
  const provider = fakeAnswerProvider

  it('returns deterministic answers for the same input', async () => {
    const request = { input: 'Are dogs allowed at Bothe-Napa Valley?' }
    const first = await provider.generateAnswer(request)
    const second = await provider.generateAnswer(request)

    expect(first).toEqual(second)
    expect(first.text).toContain('Fake provider answer for:')
    expect(first.model).toBe(DEFAULT_OPENAI_MODEL)
    expect(first.responseId).toBe('fake-response-id')
  })

  it('returns different answers for different inputs', async () => {
    const first = await provider.generateAnswer({ input: 'Question A' })
    const second = await provider.generateAnswer({ input: 'Question B' })

    expect(first.text).not.toEqual(second.text)
  })

  it('handles empty input safely', async () => {
    const result = await provider.generateAnswer({ input: '   ' })

    expect(result.text).toBe('Fake provider: no input was provided.')
  })

  it('supports custom model names in the result metadata', async () => {
    const customProvider = createFakeAnswerProvider()
    const result = await customProvider.generateAnswer({
      input: 'Test question',
      model: 'gpt-4o-mini',
    })

    expect(result.model).toBe('gpt-4o-mini')
  })
})
