#!/usr/bin/env node
/**
 * Temporary diagnostic script for OpenAI answer provider failures.
 * Loads env the same way Vite does, then calls the Responses API directly.
 *
 * Usage:
 *   node scripts/diagnose-openai.mjs
 *   node scripts/diagnose-openai.mjs --ask "What are the bear food storage rules?"
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { generateGroundedAnswer } from '../src/server/rag/groundedAnswerGenerator.js'
import {
  DEFAULT_OPENAI_BASE_URL,
  OPENAI_API_KEY_ENV,
  OPENAI_BASE_URL_ENV,
  OPENAI_MODEL_ENV,
  resolveOpenAiApiKey,
  resolveOpenAiBaseUrl,
} from '../src/server/openai/openAiResponsesClient.js'
import { ANSWER_PROVIDER_ENV, resolveAnswerProviderName } from '../src/server/openai/createAnswerProvider.js'
import { DEFAULT_OPENAI_MODEL } from '../src/server/openai/answerProvider.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const askIndex = argv.indexOf('--ask')
  return {
    question: askIndex >= 0 ? argv[askIndex + 1] : 'What are the bear food storage rules?',
    campgroundId: 'yosemite-upper-pines',
  }
}

function loadProjectEnv() {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const loaded = loadEnv(mode, projectRoot, ['OPENAI_'])

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return loaded
}

function listEnvFiles() {
  const candidates = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
  ]

  return candidates.map((fileName) => {
    const filePath = path.join(projectRoot, fileName)
    return {
      fileName,
      exists: fs.existsSync(filePath),
      path: filePath,
    }
  })
}

function printEnvSummary() {
  const envFiles = listEnvFiles()
  const provider = resolveAnswerProviderName()
  const model = process.env[OPENAI_MODEL_ENV] ?? DEFAULT_OPENAI_MODEL
  const baseUrl = resolveOpenAiBaseUrl()
  const apiKeyConfigured = (() => {
    try {
      resolveOpenAiApiKey()
      return true
    } catch {
      return false
    }
  })()

  console.log('=== Environment file presence ===')
  for (const file of envFiles) {
    console.log(`${file.exists ? 'FOUND' : 'MISSING'} ${file.fileName}`)
  }

  console.log('\n=== Resolved OpenAI configuration ===')
  console.log(JSON.stringify({
    [ANSWER_PROVIDER_ENV]: process.env[ANSWER_PROVIDER_ENV] ?? '(unset, default fake)',
    resolvedProvider: provider,
    [OPENAI_MODEL_ENV]: process.env[OPENAI_MODEL_ENV] ?? `(unset, default ${DEFAULT_OPENAI_MODEL})`,
    resolvedModel: model,
    [OPENAI_BASE_URL_ENV]: process.env[OPENAI_BASE_URL_ENV] ?? `(unset, default ${DEFAULT_OPENAI_BASE_URL})`,
    resolvedBaseUrl: baseUrl,
    [OPENAI_API_KEY_ENV]: apiKeyConfigured ? '(configured)' : '(missing)',
  }, null, 2))
}

async function callResponsesApiDirectly({ model, input, instructions }) {
  const apiKey = resolveOpenAiApiKey()
  const baseUrl = resolveOpenAiBaseUrl()

  const body = {
    model,
    input,
    instructions,
    max_output_tokens: 256,
    store: false,
  }

  console.log('\n=== Direct Responses API request ===')
  console.log(JSON.stringify({
    url: `${baseUrl}/responses`,
    model,
    inputLength: input.length,
    instructionsLength: instructions.length,
  }, null, 2))

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const rawText = await response.text()
  let payload
  try {
    payload = JSON.parse(rawText)
  } catch {
    payload = { parseError: true, rawText: rawText.slice(0, 500) }
  }

  console.log('\n=== Direct Responses API response ===')
  console.log(JSON.stringify({
    httpStatus: response.status,
    ok: response.ok,
    openAiErrorCode: payload?.error?.code ?? null,
    openAiErrorMessage: payload?.error?.message ?? null,
    responseStatus: payload?.status ?? null,
    outputTextLength: typeof payload?.output_text === 'string' ? payload.output_text.length : 0,
    outputItemCount: Array.isArray(payload?.output) ? payload.output.length : 0,
    payloadPreview: payload,
  }, null, 2))

  return { response, payload }
}

async function runGroundedAnswerPath({ question, campgroundId }) {
  console.log('\n=== generateGroundedAnswer() path ===')
  try {
    const result = await generateGroundedAnswer({
      question,
      campgroundId,
      provider: 'openai',
    })
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.log(JSON.stringify({
      errorName: error?.name,
      errorMessage: error?.message,
      status: error?.status,
      errorCode: error?.errorCode,
    }, null, 2))
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const loadedEnv = loadProjectEnv()

  console.log('=== Vite loadEnv() keys loaded ===')
  console.log(Object.keys(loadedEnv).sort().join(', ') || '(none)')

  printEnvSummary()

  try {
    resolveOpenAiApiKey()
  } catch (error) {
    console.error('\nCannot continue without OPENAI_API_KEY:', error.message)
    process.exit(1)
  }

  const model = process.env[OPENAI_MODEL_ENV] ?? DEFAULT_OPENAI_MODEL
  const input = `User question: ${args.question}\n\nThe following official campground knowledge may help answer the question:\n\n### Source 1: Example\nCampground: Upper Pines\nType: Rules\nSource: NPS (https://example.com)\n\nStore food in bear boxes.`
  const instructions = 'Answer using ONLY the retrieved source excerpts provided in the user input.'

  await callResponsesApiDirectly({ model, input, instructions })
  await runGroundedAnswerPath(args)
}

main().catch((error) => {
  console.error('Diagnostic script failed:', error)
  process.exit(1)
})
