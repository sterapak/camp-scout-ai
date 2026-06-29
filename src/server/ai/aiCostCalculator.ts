/**
 * Estimates OpenAI API costs from token usage.
 * Pricing is approximate and configurable via env overrides.
 */

export const AI_INPUT_COST_PER_MILLION_ENV = 'AI_INPUT_COST_PER_MILLION'
export const AI_OUTPUT_COST_PER_MILLION_ENV = 'AI_OUTPUT_COST_PER_MILLION'

/** Default pricing for gpt-4o-mini (USD per 1M tokens). */
const DEFAULT_INPUT_COST_PER_MILLION = 0.15
const DEFAULT_OUTPUT_COST_PER_MILLION = 0.6

/**
 * @returns {{ inputCostPerMillion: number, outputCostPerMillion: number }}
 */
export function resolveModelPricing() {
  const inputOverride = Number.parseFloat(process.env[AI_INPUT_COST_PER_MILLION_ENV] ?? '')
  const outputOverride = Number.parseFloat(process.env[AI_OUTPUT_COST_PER_MILLION_ENV] ?? '')

  return {
    inputCostPerMillion: Number.isFinite(inputOverride) && inputOverride >= 0
      ? inputOverride
      : DEFAULT_INPUT_COST_PER_MILLION,
    outputCostPerMillion: Number.isFinite(outputOverride) && outputOverride >= 0
      ? outputOverride
      : DEFAULT_OUTPUT_COST_PER_MILLION,
  }
}

/**
 * Estimates USD cost for a request.
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number}
 */
export function estimateRequestCost(inputTokens, outputTokens) {
  const { inputCostPerMillion, outputCostPerMillion } = resolveModelPricing()
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * inputCostPerMillion
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * outputCostPerMillion
  return inputCost + outputCost
}
