/**
 * Vite plugin that exposes POST /api/ask during dev and preview.
 */

import type { Plugin } from 'vite'

import { createAskRouteMiddleware } from './askRoute.js'
import { loadOpenAiServerEnv } from '../env/loadOpenAiServerEnv.js'
import { logOpenAiEnvDiagnostic } from '../openai/logOpenAiDiagnostic.js'

export function askApiPlugin(): Plugin {
  let devMode: string | undefined

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
