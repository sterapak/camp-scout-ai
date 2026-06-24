/**
 * Loads OpenAI server env vars from .env* files into process.env.
 * Vite only exposes VITE_-prefixed vars to client code by default; server
 * middleware needs OPENAI_* values from .env.local as well.
 *
 * File values always win so updated .env.local keys replace stale shell exports.
 */

import { loadEnv } from 'vite' // eslint-disable-line import/namespace -- Vite ESM is not parsed by eslint-import-resolver

/**
 * @param {string} [mode]
 * @param {{ override?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function loadOpenAiServerEnv(
  mode = process.env.NODE_ENV === 'production' ? 'production' : 'development',
  { override = true } = {},
) {
  /** @type {Record<string, string | undefined>} */
  const preservedProcessEnv = {}

  if (override) {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('OPENAI_')) {
        preservedProcessEnv[key] = process.env[key]
        delete process.env[key]
      }
    }
  }

  const loaded = loadEnv(mode, process.cwd(), ['OPENAI_'])

  for (const [key, value] of Object.entries(loaded)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  if (!override) {
    for (const [key, value] of Object.entries(preservedProcessEnv)) {
      if (process.env[key] === undefined && value !== undefined) {
        process.env[key] = value
      }
    }
  }

  return loaded
}
