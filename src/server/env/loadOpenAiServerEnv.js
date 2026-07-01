/**
 * Loads server-only env vars from .env* files into process.env.
 * Vite only exposes VITE_-prefixed vars to client code by default; API
 * middleware also needs OPENAI_*, STRIPE_*, and APP_URL from .env.local.
 *
 * File values always win so updated .env.local keys replace stale shell exports.
 */

import { loadEnv } from 'vite' // eslint-disable-line import/namespace -- Vite ESM is not parsed by eslint-import-resolver

const SERVER_ENV_PREFIXES = ['OPENAI_', 'STRIPE_']
const SERVER_ENV_EXACT_KEYS = ['APP_URL']

function isManagedServerEnvKey(key) {
  return (
    SERVER_ENV_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    SERVER_ENV_EXACT_KEYS.includes(key)
  )
}

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
      if (isManagedServerEnvKey(key)) {
        preservedProcessEnv[key] = process.env[key]
        delete process.env[key]
      }
    }
  }

  /** @type {Record<string, string>} */
  const loaded = loadEnv(mode, process.cwd(), SERVER_ENV_PREFIXES)

  const allFileEnv = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_EXACT_KEYS) {
    if (allFileEnv[key] !== undefined) {
      loaded[key] = allFileEnv[key]
    }
  }

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
