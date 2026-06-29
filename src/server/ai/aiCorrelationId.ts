/**
 * Request correlation ID generation and propagation.
 */

import { randomUUID } from 'node:crypto'

export const CORRELATION_ID_HEADER = 'x-correlation-id'

/**
 * Resolves or generates a correlation ID for an incoming request.
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function resolveCorrelationId(req) {
  const header = req.headers?.[CORRELATION_ID_HEADER]
    ?? req.headers?.[CORRELATION_ID_HEADER.toUpperCase()]

  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim()
  }

  return randomUUID()
}
