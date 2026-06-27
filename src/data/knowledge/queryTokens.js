const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'many',
  'me',
  'my',
  'of',
  'on',
  'or',
  'tell',
  'that',
  'the',
  'there',
  'this',
  'to',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'you',
  'your',
])

/**
 * Tokenizes text into lowercase terms.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeText(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0)
}

/**
 * Returns query tokens with stop words removed.
 * @param {string} query
 * @returns {string[]}
 */
export function getMeaningfulQueryTokens(query) {
  return tokenizeText(query).filter((token) => !STOP_WORDS.has(token))
}

/**
 * Detects simple question intent from a user query.
 * @param {string} query
 * @returns {{ isCountQuestion: boolean, mentionsCampsites: boolean, mentionsCampgrounds: boolean }}
 */
export function getQueryIntent(query) {
  const normalized = query.trim().toLowerCase()

  return {
    isCountQuestion: /\bhow many\b|\bnumber of\b|\bcount of\b/.test(normalized),
    mentionsCampsites: /\bcampsites?\b|\bcamping sites?\b|\bcamp sites?\b/.test(normalized),
    mentionsCampgrounds: /\bcampgrounds?\b/.test(normalized),
  }
}

/**
 * Returns true when a query token should use exact index matching only.
 * Short tokens create too many substring false positives.
 * @param {string} token
 * @returns {boolean}
 */
export function requiresExactTokenMatch(token) {
  return token.length <= 3
}
