/**
 * Server-side OpenAI Responses API client wrapper.
 * Reads OPENAI_API_KEY from the environment and never exposes it to callers.
 */

import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_MODEL,
  type AnswerProvider,
} from './answerProvider.js'
import { MissingOpenAiApiKeyError, OpenAiResponseError } from './errors.js'
import { logOpenAiDiagnostic } from './logOpenAiDiagnostic.js'
import {
  estimateTokenCount,
  resolveMaxContextTokens,
  resolveMaxOutputTokens,
  truncateTextToTokenBudget,
} from './promptLimits.js'

export const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY'
export const OPENAI_MODEL_ENV = 'OPENAI_MODEL'
export const OPENAI_BASE_URL_ENV = 'OPENAI_BASE_URL'
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

export interface OpenAiAnswerProviderOptions {
  apiKey?: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  defaultModel?: string
  defaultMaxOutputTokens?: number
}

interface FetchLikeResponse {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
  text?: () => Promise<string>
}

interface OpenAiErrorPayload {
  message?: string
  code?: string
}

interface OpenAiUsagePayload {
  input_tokens?: number
  output_tokens?: number
}

interface OpenAiContentPart {
  type?: string
  text?: string
}

interface OpenAiOutputItem {
  type?: string
  content?: OpenAiContentPart[]
}

export interface OpenAiResponsePayload {
  output_text?: string
  output?: OpenAiOutputItem[]
  error?: OpenAiErrorPayload
  usage?: OpenAiUsagePayload
  model?: string
  id?: string
  status?: string
}

export function resolveOpenAiApiKey(explicitKey?: string): string {
  const key = explicitKey ?? process.env[OPENAI_API_KEY_ENV]
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new MissingOpenAiApiKeyError()
  }
  return key.trim()
}

export function resolveOpenAiBaseUrl(explicitBaseUrl?: string): string {
  const baseUrl = explicitBaseUrl ?? process.env[OPENAI_BASE_URL_ENV] ?? DEFAULT_OPENAI_BASE_URL
  return baseUrl.replace(/\/+$/, '')
}

export async function readJsonResponseBody(response: FetchLikeResponse): Promise<OpenAiResponsePayload> {
  if (typeof response.text === 'function') {
    const rawText = await response.text()
    if (typeof rawText !== 'string' || rawText.trim().length === 0) {
      throw new Error('Empty response body')
    }
    return JSON.parse(rawText) as OpenAiResponsePayload
  }

  if (typeof response.json === 'function') {
    return (await response.json()) as OpenAiResponsePayload
  }

  throw new Error('Response body is not readable')
}

export function extractOutputText(payload: OpenAiResponsePayload): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.length > 0) {
    return payload.output_text
  }

  const output = Array.isArray(payload?.output) ? payload.output : []
  const textParts: string[] = []

  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) {
      continue
    }

    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') {
        textParts.push(part.text)
      }
    }
  }

  return textParts.join('\n').trim()
}

export function createOpenAiAnswerProvider(options: OpenAiAnswerProviderOptions = {}): AnswerProvider {
  const fetchImpl = options.fetchImpl ?? fetch
  const defaultModel = options.defaultModel ?? process.env[OPENAI_MODEL_ENV] ?? DEFAULT_OPENAI_MODEL
  const defaultMaxOutputTokens = resolveMaxOutputTokens(options.defaultMaxOutputTokens)

  return {
    name: 'openai',
    async generateAnswer(request) {
      const apiKey = resolveOpenAiApiKey(options.apiKey)
      const baseUrl = resolveOpenAiBaseUrl(options.baseUrl)
      const rawInput = typeof request?.input === 'string' ? request.input.trim() : ''

      if (rawInput.length === 0) {
        logOpenAiDiagnostic('generateAnswer.emptyInput', {
          provider: 'openai',
          model: defaultModel,
          errorMessage: 'Answer generation requires non-empty input.',
        })
        throw new OpenAiResponseError('Answer generation requires non-empty input.')
      }

      const model = typeof request?.model === 'string' && request.model.trim().length > 0
        ? request.model.trim()
        : defaultModel

      const maxOutputTokens = resolveMaxOutputTokens(request?.maxOutputTokens, defaultMaxOutputTokens)
      const maxContextTokens = resolveMaxContextTokens()
      const cappedInput = truncateTextToTokenBudget(rawInput, maxContextTokens)
      const input = cappedInput.text

      logOpenAiDiagnostic('generateAnswer.request', {
        provider: 'openai',
        model,
        promptTokenEstimate: estimateTokenCount(input),
        maxOutputTokens,
        contextTruncated: cappedInput.truncated,
      })

      const body: Record<string, unknown> = {
        model,
        input,
        max_output_tokens: maxOutputTokens,
        store: false,
      }

      if (typeof request?.instructions === 'string' && request.instructions.trim().length > 0) {
        body.instructions = request.instructions.trim()
      }

      const response = await fetchImpl(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }) as FetchLikeResponse

      let payload: OpenAiResponsePayload
      try {
        payload = await readJsonResponseBody(response)
      } catch {
        logOpenAiDiagnostic('generateAnswer.nonJsonResponse', {
          provider: 'openai',
          model,
          responseStatus: response.status,
          errorMessage: 'OpenAI returned a non-JSON response.',
        })
        throw new OpenAiResponseError('OpenAI returned a non-JSON response.', {
          status: response.status,
        })
      }

      if (!response.ok) {
        const message = typeof payload?.error?.message === 'string'
          ? payload.error.message
          : `OpenAI request failed with status ${response.status}.`
        const errorCode = typeof payload?.error?.code === 'string' ? payload.error.code : undefined
        logOpenAiDiagnostic('generateAnswer.httpError', {
          provider: 'openai',
          model,
          responseStatus: response.status,
          errorCode,
          errorMessage: message,
        })
        throw new OpenAiResponseError(message, {
          status: response.status,
          errorCode,
        })
      }

      if (payload?.error) {
        const message = typeof payload.error.message === 'string'
          ? payload.error.message
          : 'OpenAI returned an error response.'
        const errorCode = typeof payload.error.code === 'string' ? payload.error.code : undefined
        logOpenAiDiagnostic('generateAnswer.payloadError', {
          provider: 'openai',
          model,
          responseStatus: response.status,
          errorCode,
          errorMessage: message,
        })
        throw new OpenAiResponseError(message, {
          status: response.status,
          errorCode,
        })
      }

      const text = extractOutputText(payload)
      if (text.length === 0) {
        const responseStatus = typeof payload?.status === 'string' ? payload.status : undefined
        logOpenAiDiagnostic('generateAnswer.emptyAnswer', {
          provider: 'openai',
          model,
          responseStatus: response.status,
          errorCode: responseStatus,
          errorMessage: `OpenAI returned an empty answer. response.status=${responseStatus ?? 'unknown'}`,
        })
        throw new OpenAiResponseError('OpenAI returned an empty answer.')
      }

      const usage = payload?.usage && typeof payload.usage === 'object' ? payload.usage : {}

      logOpenAiDiagnostic('generateAnswer.success', {
        provider: 'openai',
        model: typeof payload?.model === 'string' ? payload.model : model,
        responseStatus: response.status,
        promptTokenEstimate: typeof usage.input_tokens === 'number'
          ? usage.input_tokens
          : estimateTokenCount(input),
        maxOutputTokens,
      })

      return {
        text,
        model: typeof payload?.model === 'string' ? payload.model : model,
        inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined,
        outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
        responseId: typeof payload?.id === 'string' ? payload.id : undefined,
      }
    },
  }
}
