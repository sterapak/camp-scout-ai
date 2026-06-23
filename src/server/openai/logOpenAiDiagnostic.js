/**
 * Safe diagnostic logging for OpenAI answer provider configuration and failures.
 * Never logs secrets such as API keys.
 */

/**
 * Writes diagnostic output directly to stderr so Vite middleware logs stay visible.
 * @param {string} label
 * @param {Record<string, unknown>} payload
 */
function writeDiagnostic(label, payload) {
  process.stderr.write(`${label} ${JSON.stringify(payload)}\n`)
}

/**
 * Returns a safe fingerprint for an API key (prefix + suffix only).
 * @param {string | undefined} apiKey
 * @returns {string}
 */
export function describeOpenAiApiKey(apiKey) {
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return '(missing)'
  }

  const trimmed = apiKey.trim()
  if (trimmed.length <= 8) {
    return '(configured)'
  }

  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`
}

/**
 * @param {string} scope
 * @param {{
 *   explicitProvider?: string | undefined,
 *   envProvider?: string | undefined,
 *   resolvedProvider?: string,
 *   provider?: string,
 *   model?: string,
 *   responseStatus?: number,
 *   errorCode?: string,
 *   errorMessage?: string,
 *   apiKeyFingerprint?: string,
 * }} details
 */
export function logOpenAiDiagnostic(scope, details = {}) {
  const payload = {
    scope,
    explicitProvider: details.explicitProvider ?? null,
    envProvider: details.envProvider ?? process.env.OPENAI_ANSWER_PROVIDER ?? '(unset)',
    resolvedProvider: details.resolvedProvider ?? details.provider ?? null,
    provider: details.provider ?? details.resolvedProvider ?? 'openai',
    model: details.model ?? '(unknown)',
    responseStatus: details.responseStatus ?? null,
    errorCode: details.errorCode ?? null,
    errorMessage: details.errorMessage ?? null,
    apiKeyFingerprint: details.apiKeyFingerprint ?? describeOpenAiApiKey(process.env.OPENAI_API_KEY),
  }

  writeDiagnostic('[OpenAI diagnostic]', payload)
}

/**
 * Logs resolved OpenAI-related env values without exposing secrets.
 * @param {string} scope
 */
export function logOpenAiEnvDiagnostic(scope) {
  const provider = process.env.OPENAI_ANSWER_PROVIDER ?? '(unset)'
  const model = process.env.OPENAI_MODEL ?? '(unset, default gpt-4o-mini)'
  const baseUrl = process.env.OPENAI_BASE_URL ?? '(unset, default https://api.openai.com/v1)'
  const apiKey = process.env.OPENAI_API_KEY

  writeDiagnostic('[OpenAI env diagnostic]', {
    scope,
    OPENAI_ANSWER_PROVIDER: provider,
    OPENAI_MODEL: model,
    OPENAI_BASE_URL: baseUrl,
    OPENAI_API_KEY: describeOpenAiApiKey(apiKey),
  })
}
