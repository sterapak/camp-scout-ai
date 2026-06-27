/**
 * Formats ISO timestamps for user-facing "Generated on" labels.
 */

const DEFAULT_OPTIONS = {
  dateStyle: 'long',
  timeStyle: 'short',
}

/**
 * Formats an ISO timestamp in the user's local timezone and locale.
 * @param {string} isoTimestamp
 * @param {{
 *   locale?: string | string[],
 *   timeZone?: string,
 *   dateStyle?: 'full' | 'long' | 'medium' | 'short',
 *   timeStyle?: 'full' | 'long' | 'medium' | 'short',
 * }} [options]
 * @returns {string}
 */
export function formatGeneratedAt(isoTimestamp, options = {}) {
  const parsed = Date.parse(isoTimestamp)
  if (Number.isNaN(parsed)) {
    return isoTimestamp
  }

  const formatter = new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? DEFAULT_OPTIONS.dateStyle,
    timeStyle: options.timeStyle ?? DEFAULT_OPTIONS.timeStyle,
    timeZone: options.timeZone,
  })

  return formatter.format(new Date(parsed))
}

/**
 * Formats a knowledge snapshot fetch date for display.
 * @param {string} isoTimestamp
 * @param {{ locale?: string | string[], timeZone?: string }} [options]
 * @returns {string}
 */
export function formatKnowledgeSnapshotDate(isoTimestamp, options = {}) {
  const parsed = Date.parse(isoTimestamp)
  if (Number.isNaN(parsed)) {
    return isoTimestamp
  }

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeZone: options.timeZone,
  }).format(new Date(parsed))
}
