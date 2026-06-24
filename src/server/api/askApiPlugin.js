/**
 * Vite plugin that exposes POST /api/ask during dev and preview.
 */

import { loadEnv } from 'vite'
import { createAskRouteMiddleware } from './askRoute.js'
import { logOpenAiEnvDiagnostic } from '../openai/logOpenAiDiagnostic.js'

/**
 * Loads OpenAI server env vars from .env* files into process.env.
 * Vite only exposes VITE_-prefixed vars by default; server middleware
 * needs OPENAI_* values from .env.local as well.
 *
 * File values always win so updated .env.local keys replace stale shell exports.
 * @param {string} [mode]
 * @param {{ override?: boolean }} [options]
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

/**
 * @returns {import('vite').Plugin}
 */
export function askApiPlugin() {
  /** @type {string | undefined} */
  let devMode

  const middleware = createAskRouteMiddleware({
    reloadOpenAiEnv: () => {
      if (devMode) {
        loadOpenAiServerEnv(devMode)
      }
    },
  })

  return {
    name: 'camp-scout-ask-api',
    config(_config, { mode }) {
      devMode = mode
      loadOpenAiServerEnv(mode)
    },
    configureServer(server) {
      logOpenAiEnvDiagnostic('askApiPlugin.configureServer')
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      loadOpenAiServerEnv(devMode ?? 'production')
      logOpenAiEnvDiagnostic('askApiPlugin.configurePreviewServer')
      server.middlewares.use(middleware)
    },
  }
}
