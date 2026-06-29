/**
 * Structured AI request logging.
 * Never logs prompts, API keys, or private campground data.
 */

/**
 * Logs metadata for an AI request.
 * @param {{
 *   timestamp: string,
 *   endpoint: string,
 *   requestId: string,
 *   correlationId: string,
 *   model: string,
 *   provider: string,
 *   promptTokenEstimate: number,
 *   completionTokens: number,
 *   latencyMs: number,
 *   clientIp: string,
 *   authenticatedUser: string,
 *   responseStatus: number,
 * }} entry
 */
export function logAiRequest(entry) {
  const payload = {
    type: 'ai_request',
    timestamp: entry.timestamp,
    endpoint: entry.endpoint,
    requestId: entry.requestId,
    correlationId: entry.correlationId,
    model: entry.model,
    provider: entry.provider,
    promptTokenEstimate: entry.promptTokenEstimate,
    completionTokens: entry.completionTokens,
    latencyMs: entry.latencyMs,
    clientIp: entry.clientIp,
    authenticatedUser: entry.authenticatedUser,
    responseStatus: entry.responseStatus,
  }

  process.stderr.write(`[AI request] ${JSON.stringify(payload)}\n`)
}

/**
 * Logs that AI is globally disabled.
 * @param {string} [scope]
 */
export function logAiDisabled(scope = 'startup') {
  process.stderr.write(`[AI disabled] ${JSON.stringify({ scope, message: 'AI_ENABLED is false; using fake provider only.' })}\n`)
}

/**
 * Logs maintenance mode activation.
 */
export function logAiMaintenanceMode() {
  process.stderr.write('[AI maintenance] AI maintenance mode is enabled.\n')
}

/**
 * Logs an AI error with correlation context.
 * @param {string} message
 * @param {{ correlationId?: string, requestId?: string, endpoint?: string, error?: string }} context
 */
export function logAiError(message, context = {}) {
  process.stderr.write(`[AI error] ${JSON.stringify({ message, ...context })}\n`)
}
