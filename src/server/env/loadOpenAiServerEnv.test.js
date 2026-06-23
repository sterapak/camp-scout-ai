/** @jest-environment node */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { loadOpenAiServerEnv } from './loadOpenAiServerEnv.js'

describe('loadOpenAiServerEnv', () => {
  /** @type {string | undefined} */
  let originalProvider
  /** @type {string | undefined} */
  let originalApiKey
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    originalProvider = process.env.OPENAI_ANSWER_PROVIDER
    originalApiKey = process.env.OPENAI_API_KEY
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-scout-env-'))
  })

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.OPENAI_ANSWER_PROVIDER
    } else {
      process.env.OPENAI_ANSWER_PROVIDER = originalProvider
    }

    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalApiKey
    }

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('loads OPENAI_* values from .env.local and overrides stale shell exports', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'fake'
    process.env.OPENAI_API_KEY = 'stale-shell-key'

    fs.writeFileSync(
      path.join(tempDir, '.env.local'),
      'OPENAI_ANSWER_PROVIDER=openai\nOPENAI_API_KEY=file-key\n',
      'utf8',
    )

    const originalCwd = process.cwd()
    process.chdir(tempDir)

    try {
      const loaded = loadOpenAiServerEnv('development')

      expect(loaded.OPENAI_ANSWER_PROVIDER).toBe('openai')
      expect(process.env.OPENAI_ANSWER_PROVIDER).toBe('openai')
      expect(process.env.OPENAI_API_KEY).toBe('file-key')
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('does not override existing process.env values when override is false', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'fake'

    fs.writeFileSync(
      path.join(tempDir, '.env.local'),
      'OPENAI_ANSWER_PROVIDER=openai\n',
      'utf8',
    )

    const originalCwd = process.cwd()
    process.chdir(tempDir)

    try {
      loadOpenAiServerEnv('development', { override: false })

      expect(process.env.OPENAI_ANSWER_PROVIDER).toBe('fake')
    } finally {
      process.chdir(originalCwd)
    }
  })
})
