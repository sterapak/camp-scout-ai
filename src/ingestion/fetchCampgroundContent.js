import { extractReadableText } from './extractContent.js'
import { fetchSource } from './fetchSource.js'
import { getSupplementalSourceUrls } from './ingestionConfig.js'

/**
 * @typedef {Object} FetchCampgroundContentResult
 * @property {boolean} ok
 * @property {string} [readableText]
 * @property {string[]} [fetchedUrls]
 * @property {string[]} [failedSupplementalUrls]
 * @property {string} [error]
 */

/**
 * Fetches and merges readable text from a campground's primary and supplemental official sources.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<FetchCampgroundContentResult>}
 */
export async function fetchCampgroundReadableText(campground, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const sourceUrls = [
    campground.sourceUrl,
    ...getSupplementalSourceUrls(campground.id),
  ]

  /** @type {string[]} */
  const textSections = []
  /** @type {string[]} */
  const fetchedUrls = []
  /** @type {string[]} */
  const failedSupplementalUrls = []

  for (const [index, sourceUrl] of sourceUrls.entries()) {
    const fetchResult = await fetchSource(sourceUrl, { fetchImpl })

    if (!fetchResult.ok) {
      if (index === 0) {
        return {
          ok: false,
          error: fetchResult.error,
        }
      }

      failedSupplementalUrls.push(sourceUrl)
      continue
    }

    const readableText = extractReadableText(fetchResult.html)
    if (readableText.trim().length === 0) {
      if (index === 0) {
        return {
          ok: false,
          error: `No readable content extracted from "${sourceUrl}".`,
        }
      }

      failedSupplementalUrls.push(sourceUrl)
      continue
    }

    textSections.push(readableText)
    fetchedUrls.push(sourceUrl)
  }

  return {
    ok: true,
    readableText: textSections.join('\n\n'),
    fetchedUrls,
    failedSupplementalUrls,
  }
}
