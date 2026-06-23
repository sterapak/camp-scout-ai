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
 */
export function loadOpenAiServerEnv(mode = process.env.NODE_ENV === 'production' ? 'production' : 'development') {
  const loaded = loadEnv(mode, process.cwd(), ['OPENAI_'])

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return loaded
}

/**
 * @returns {import('vite').Plugin}
 */
export function askApiPlugin() {
  const middleware = createAskRouteMiddleware()

  return {
    name: 'camp-scout-ask-api',
    config(_config, { mode }) {
      loadOpenAiServerEnv(mode)
    },
    configureServer(server) {
      logOpenAiEnvDiagnostic('askApiPlugin.configureServer')
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
