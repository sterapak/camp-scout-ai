/** @jest-environment node */

import { describeOpenAiApiKey, logOpenAiDiagnostic } from './logOpenAiDiagnostic.js'

describe('logOpenAiDiagnostic helpers', () => {
  let stderrSpy

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    stderrSpy.mockRestore()
  })

  it('masks API keys in diagnostics', () => {
    expect(describeOpenAiApiKey(undefined)).toBe('(missing)')
    expect(describeOpenAiApiKey('   ')).toBe('(missing)')
    expect(describeOpenAiApiKey('short')).toBe('(configured)')
    expect(describeOpenAiApiKey('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe('sk-proj...wxyz')
  })

  it('logs provider selection without exposing secrets', () => {
    logOpenAiDiagnostic('createAnswerProvider', {
      explicitProvider: null,
      envProvider: 'openai',
      resolvedProvider: 'openai',
      apiKeyFingerprint: '(missing)',
    })

    expect(stderrSpy).toHaveBeenCalledTimes(1)

    const output = String(stderrSpy.mock.calls[0][0])
    expect(output).toContain('[OpenAI diagnostic]')
    expect(output).toContain('"resolvedProvider":"openai"')
    expect(output).not.toMatch(/sk-proj-|sk-live-/)
  })
})
