/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import { createAnswerProvider, resolveAnswerProviderName } from './createAnswerProvider.js'
import { fakeAnswerProvider } from './fakeAnswerProvider.js'

describe('createAnswerProvider', () => {
  const originalProvider = process.env.OPENAI_ANSWER_PROVIDER

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.OPENAI_ANSWER_PROVIDER
    } else {
      process.env.OPENAI_ANSWER_PROVIDER = originalProvider
    }
  })

  it('defaults to the fake provider', () => {
    delete process.env.OPENAI_ANSWER_PROVIDER
    const provider = createAnswerProvider()
    expect(provider.name).toBe('fake')
  })

  it('selects the OpenAI provider when configured', () => {
    const provider = createAnswerProvider({
      provider: 'openai',
      protectedAccess: true,
      apiKey: 'test-key',
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ output_text: 'Answer' }),
      }),
    })

    expect(provider.name).toBe('openai')
  })

  it('selects the OpenAI provider when OPENAI_ANSWER_PROVIDER=openai', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'openai'

    const provider = createAnswerProvider({
      protectedAccess: true,
      apiKey: 'test-key',
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ output_text: 'Answer' }),
      }),
    })

    expect(provider.name).toBe('openai')
  })

  it('prefers an explicit provider override over env configuration', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'openai'

    const provider = createAnswerProvider({ provider: 'fake' })

    expect(provider.name).toBe('fake')
  })

  it('does not call OpenAI when OPENAI_ANSWER_PROVIDER is fake', async () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'fake'
    process.env.OPENAI_API_KEY = 'sk-test-key-should-not-be-used'

    const fetchImpl = jest.fn()
    const provider = createAnswerProvider({ fetchImpl })

    expect(provider.name).toBe('fake')

    const result = await provider.generateAnswer({ input: 'What are the quiet hours?' })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.text).toContain('Fake provider answer for:')

    delete process.env.OPENAI_API_KEY
  })

  it('resolves provider names safely', () => {
    expect(resolveAnswerProviderName(undefined)).toBe('fake')
    expect(resolveAnswerProviderName('fake')).toBe('fake')
    expect(resolveAnswerProviderName('openai')).toBe('fake')
    expect(resolveAnswerProviderName('openai', { protectedAccess: true })).toBe('openai')
    expect(resolveAnswerProviderName('unknown')).toBe('fake')
  })

  it('does not enable OpenAI without protected access even when env is openai', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'openai'

    const provider = createAnswerProvider({
      apiKey: 'test-key',
      fetchImpl: jest.fn(),
    })

    expect(provider.name).toBe('fake')
  })
})

describe('client bundle safety', () => {
  const projectRoot = path.resolve(__dirname, '../../..')
  const clientRoots = ['src/components', 'src/pages', 'src/App.jsx', 'src/main.jsx']

  function collectSourceFiles(relativePath) {
    const absolutePath = path.join(projectRoot, relativePath)

    if (!fs.existsSync(absolutePath)) {
      return []
    }

    const stats = fs.statSync(absolutePath)
    if (stats.isFile()) {
      return [absolutePath]
    }

    const files = []
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const entryPath = path.join(absolutePath, entry.name)
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(path.relative(projectRoot, entryPath)))
      } else if (/\.(js|jsx)$/.test(entry.name)) {
        files.push(entryPath)
      }
    }
    return files
  }

  it('does not import server OpenAI modules from React client code', () => {
    const clientFiles = clientRoots.flatMap((relativePath) => collectSourceFiles(relativePath))
    const offenders = clientFiles.filter((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8')
      return /server\/openai|createAnswerProvider|openAiResponsesClient/.test(source)
    })

    expect(offenders).toEqual([])
  })

  it('does not reference VITE-prefixed OpenAI env vars in server modules', () => {
    const serverDir = path.join(projectRoot, 'src/server/openai')
    const serverFiles = fs.readdirSync(serverDir)
      .filter((fileName) => fileName.endsWith('.js') && !fileName.endsWith('.test.js'))
      .map((fileName) => path.join(serverDir, fileName))

    for (const filePath of serverFiles) {
      const source = fs.readFileSync(filePath, 'utf8')
      expect(source).not.toMatch(/VITE_OPENAI|import\.meta\.env/)
    }
  })

  it('uses the fake provider in tests without requiring an API key', async () => {
    const result = await fakeAnswerProvider.generateAnswer({
      input: 'What are the quiet hours?',
    })

    expect(result.text).toContain('Fake provider answer for:')
  })

  it('does not embed OpenAI key env names in the production bundle', () => {
    const assetsDir = path.join(projectRoot, 'docs/assets')
    if (!fs.existsSync(assetsDir)) {
      return
    }

    const bundleFiles = fs.readdirSync(assetsDir).filter((fileName) => fileName.endsWith('.js'))
    const forbiddenPatterns = [/OPENAI_API_KEY/, /sk-proj-/, /sk-live-/]

    for (const fileName of bundleFiles) {
      const bundleSource = fs.readFileSync(path.join(assetsDir, fileName), 'utf8')
      for (const pattern of forbiddenPatterns) {
        expect(bundleSource).not.toMatch(pattern)
      }
    }
  })
})
