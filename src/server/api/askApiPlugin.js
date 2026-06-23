/**
 * Vite plugin that exposes POST /api/ask during dev and preview.
 */

import { createAskRouteMiddleware } from './askRoute.js'

/**
 * @returns {import('vite').Plugin}
 */
export function askApiPlugin() {
  const middleware = createAskRouteMiddleware()

  return {
    name: 'camp-scout-ask-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
