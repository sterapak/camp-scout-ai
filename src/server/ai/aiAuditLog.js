/**
 * Persistent AI audit log with configurable retention.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { resolveAuditLogPath, resolveAuditLogRetentionDays } from './aiConfig.js'

/** @typedef {{
 *   timestamp: string,
 *   endpoint: string,
 *   requestId: string,
 *   correlationId: string,
 *   provider: string,
 *   model: string,
 *   inputTokens: number,
 *   outputTokens: number,
 *   latencyMs: number,
 *   authenticatedCaller: string,
 *   responseStatus: number,
 * }} AuditLogEntry */

/** @type {AuditLogEntry[]} */
let inMemoryAuditLog = []

/** @type {boolean} */
let loadedFromDisk = false

/**
 * @param {string} filePath
 */
function ensureAuditLogDirectory(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Loads audit log from disk into memory.
 * @param {string} [filePath]
 */
export function loadAuditLogFromDisk(filePath = resolveAuditLogPath()) {
  if (loadedFromDisk) {
    return
  }

  loadedFromDisk = true

  if (!existsSync(filePath)) {
    return
  }

  try {
    const content = readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter((line) => line.trim().length > 0)
    inMemoryAuditLog = lines.map((line) => JSON.parse(line))
  } catch {
    inMemoryAuditLog = []
  }
}

/**
 * Persists the in-memory audit log to disk.
 * @param {string} [filePath]
 */
export function persistAuditLogToDisk(filePath = resolveAuditLogPath()) {
  ensureAuditLogDirectory(filePath)
  const content = inMemoryAuditLog.map((entry) => JSON.stringify(entry)).join('\n')
  writeFileSync(filePath, content.length > 0 ? `${content}\n` : '', 'utf8')
}

/**
 * Appends an entry to the audit log.
 * @param {AuditLogEntry} entry
 * @param {{ persist?: boolean, filePath?: string }} [options]
 */
export function appendAuditLogEntry(entry, options = {}) {
  loadAuditLogFromDisk(options.filePath)

  inMemoryAuditLog.push(entry)

  const retentionDays = resolveAuditLogRetentionDays()
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  inMemoryAuditLog = inMemoryAuditLog.filter((record) => {
    const recordTime = Date.parse(record.timestamp)
    return Number.isFinite(recordTime) && recordTime >= cutoff
  })

  if (options.persist !== false) {
    try {
      const filePath = options.filePath ?? resolveAuditLogPath()
      ensureAuditLogDirectory(filePath)
      appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8')
    } catch {
      // Audit log persistence failures should not break request handling.
    }
  }
}

/**
 * Returns the most recent audit log entries.
 * @param {number} [limit]
 * @returns {AuditLogEntry[]}
 */
export function queryRecentAuditLog(limit = 50) {
  loadAuditLogFromDisk()
  return inMemoryAuditLog.slice(-limit).reverse()
}

/**
 * Clears audit log state (for tests).
 * @param {string} [filePath]
 */
export function resetAuditLog(filePath = resolveAuditLogPath()) {
  inMemoryAuditLog = []
  loadedFromDisk = false

  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath)
    } catch {
      // Ignore cleanup failures in tests.
    }
  }
}

/**
 * @returns {number}
 */
export function getAuditLogCount() {
  loadAuditLogFromDisk()
  return inMemoryAuditLog.length
}

/**
 * Creates an audit entry from a request record.
 * @param {import('./aiUsageStore.js').AiRequestRecord} record
 * @returns {AuditLogEntry}
 */
export function auditEntryFromRecord(record) {
  return {
    timestamp: record.timestamp,
    endpoint: record.endpoint,
    requestId: record.requestId,
    correlationId: record.correlationId,
    provider: record.provider,
    model: record.model,
    inputTokens: record.promptTokenEstimate,
    outputTokens: record.completionTokens,
    latencyMs: record.latencyMs,
    authenticatedCaller: record.authenticatedUser,
    responseStatus: record.responseStatus,
  }
}
