/**
 * Vite plugin that exposes POST /api/ask during dev and preview.
 */

import { createAskRouteMiddleware } from './askRoute.ts'
import { loadOpenAiServerEnv } from '../env/loadOpenAiServerEnv.js'
import { logOpenAiEnvDiagnostic } from '../openai/logOpenAiDiagnostic.js'

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
