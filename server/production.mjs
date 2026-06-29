/**
 * Production HTTP server for Camp Scout AI.
 * Serves the built SPA, API routes, and a health check for load balancers.
 */

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createAskRouteMiddleware } from '../src/server/api/askRoute.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const STATIC_ROOT = join(__dirname, '../dist')
const PORT = Number(process.env.PORT) || 8080

/** @type {Record<string, string>} */
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const apiMiddleware = createAskRouteMiddleware()

/**
 * Resolves a request path to a file under STATIC_ROOT, blocking traversal.
 * @param {string} requestPath
 * @returns {string | null}
 */
function resolveStaticPath(requestPath) {
  const pathname = decodeURIComponent(requestPath.split('?')[0] || '/')
  const relativePath = pathname === '/' ? '/index.html' : pathname
  const resolvedPath = join(STATIC_ROOT, relativePath)
  const normalizedRoot = join(STATIC_ROOT, '/')

  if (!resolvedPath.startsWith(normalizedRoot)) {
    return null
  }

  return resolvedPath
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} filePath
 */
function sendStaticFile(res, filePath) {
  const extension = extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[extension] ?? 'application/octet-stream'

  res.statusCode = 200
  res.setHeader('Content-Type', contentType)
  createReadStream(filePath).pipe(res)
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
function serveStaticOrSpa(req, res) {
  const filePath = resolveStaticPath(req.url ?? '/')

  if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
    sendStaticFile(res, filePath)
    return
  }

  const indexPath = join(STATIC_ROOT, 'index.html')

  if (existsSync(indexPath)) {
    sendStaticFile(res, indexPath)
    return
  }

  res.statusCode = 503
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error: 'Application is not built yet.' }))
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
function runApiMiddleware(req, res) {
  return new Promise((resolve) => {
    apiMiddleware(req, res, resolve)
  })
}

const server = createServer(async (req, res) => {
  await runApiMiddleware(req, res)

  if (res.writableEnded) {
    return
  }

  serveStaticOrSpa(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Camp Scout AI listening on http://0.0.0.0:${PORT}`)
})
