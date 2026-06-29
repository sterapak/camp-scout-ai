#!/usr/bin/env node
/**
 * Generates an AI cost reconciliation report comparing local metrics to OpenAI billing.
 *
 * Usage:
 *   node scripts/ai-reconciliation.mjs
 *   node scripts/ai-reconciliation.mjs --openai-requests=100 --openai-input-tokens=50000 --format=csv
 */

import { writeFileSync } from 'node:fs'

import {
  generateReconciliationReport,
  reconciliationReportToCsv,
} from '../src/server/ai/aiReconciliation.js'

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {}

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue
    }

    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? 'true'
  }

  return args
}

const args = parseArgs(process.argv.slice(2))

const report = generateReconciliationReport({
  openAiReportedRequests: args['openai-requests'] ? Number.parseInt(args['openai-requests'], 10) : undefined,
  openAiReportedInputTokens: args['openai-input-tokens'] ? Number.parseInt(args['openai-input-tokens'], 10) : undefined,
  openAiReportedOutputTokens: args['openai-output-tokens'] ? Number.parseInt(args['openai-output-tokens'], 10) : undefined,
  openAiReportedCostUsd: args['openai-cost-usd'] ? Number.parseFloat(args['openai-cost-usd']) : undefined,
})

if (args.format === 'csv') {
  const csv = reconciliationReportToCsv(report)
  if (args.output) {
    writeFileSync(args.output, csv, 'utf8')
    console.log(`Wrote reconciliation CSV to ${args.output}`)
  } else {
    console.log(csv)
  }
} else {
  console.log(JSON.stringify(report, null, 2))
}
