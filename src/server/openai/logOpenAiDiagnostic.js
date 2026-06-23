/**
 * Temporary diagnostic logging for OpenAI answer provider failures.
 * Never logs secrets such as API keys.
 */

/**
 * @param {string} scope
 * @param {{
 *   provider?: string,
 *   model?: string,
 *   responseStatus?: number,
 *   errorCode?: string,
 *   errorMessage?: string,
 * }} details
 */
export function logOpenAiDiagnostic(scope, details = {}) {
  const payload = {
    scope,
    provider: details.provider ?? 'openai',
    model: details.model ?? '(unknown)',
    responseStatus: details.responseStatus ?? null,
    errorCode: details.errorCode ?? null,
    errorMessage: details.errorMessage ?? null,
  }

  console.error('[OpenAI diagnostic]', JSON.stringify(payload))
}

/**
 * Logs resolved OpenAI-related env values without exposing secrets.
 * @param {string} scope
 */
export function logOpenAiEnvDiagnostic(scope) {
  const provider = process.env.OPENAI_ANSWER_PROVIDER ?? '(unset)'
  const model = process.env.OPENAI_MODEL ?? '(unset, default gpt-4o-mini)'
  const baseUrl = process.env.OPENAI_BASE_URL ?? '(unset, default https://api.openai.com/v1)'
  const apiKeyConfigured = typeof process.env.OPENAI_API_KEY === 'string'
    && process.env.OPENAI_API_KEY.trim().length > 0

  console.error('[OpenAI env diagnostic]', JSON.stringify({
    scope,
    OPENAI_ANSWER_PROVIDER: provider,
    OPENAI_MODEL: model,
    OPENAI_BASE_URL: baseUrl,
    OPENAI_API_KEY: apiKeyConfigured ? '(configured)' : '(missing)',
  }))
}
