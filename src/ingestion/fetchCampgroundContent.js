// @ts-nocheck
import { extractReadableText } from './extractContent.js'
import { fetchSource } from './fetchSource.js'
import { hasConfiguredSources } from '../data/campgroundSources.js'
import { getSupplementalSourceUrls } from './ingestionConfig.js'

/**
 * @typedef {import('../data/campgroundSchema.js').CampgroundSource} CampgroundSource
 */

/**
 * @typedef {Object} FetchedCampgroundSourceContent
 * @property {CampgroundSource} source
 * @property {string} readableText
 * @property {string} url
 */

/**
 * @typedef {Object} FetchCampgroundContentResult
 * @property {boolean} ok
 * @property {string} [readableText]
 * @property {FetchedCampgroundSourceContent[]} [fetchedSources]
 * @property {string[]} [fetchedUrls]
 * @property {string[]} [failedSupplementalUrls]
 * @property {string} [error]
 */

/**
 * Fetches readable text for each configured source on a multi-authority campground.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {CampgroundSource[]} sources
 * @param {Object} options
 * @param {typeof fetch} options.fetchImpl
 * @returns {Promise<FetchCampgroundContentResult>}
 */
async function fetchMultiSourceContent(campground, sources, { fetchImpl }) {
  /** @type {FetchedCampgroundSourceContent[]} */
  const fetchedSources = []
  /** @type {string[]} */
  const fetchedUrls = []
  /** @type {string[]} */
  const failedSupplementalUrls = []

  for (const [index, source] of sources.entries()) {
    const fetchResult = await fetchSource(source.url, { fetchImpl })

    if (!fetchResult.ok) {
      if (index === 0) {
        return {
          ok: false,
          error: fetchResult.error,
        }
      }

      failedSupplementalUrls.push(source.url)
      continue
    }

    const readableText = extractReadableText(fetchResult.html)
    if (readableText.trim().length === 0) {
      if (index === 0) {
        return {
          ok: false,
          error: `No readable content extracted from "${source.url}".`,
        }
      }

      failedSupplementalUrls.push(source.url)
      continue
    }

    fetchedSources.push({
      source,
      readableText,
      url: source.url,
    })
    fetchedUrls.push(source.url)
  }

  if (fetchedSources.length === 0) {
    return {
      ok: false,
      error: `No readable content extracted for "${campground.id}".`,
    }
  }

  return {
    ok: true,
    readableText: fetchedSources.map((entry) => entry.readableText).join('\n\n'),
    fetchedSources,
    fetchedUrls,
    failedSupplementalUrls,
  }
}

/**
 * Fetches and merges readable text from a legacy single-source campground.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {Object} options
 * @param {typeof fetch} options.fetchImpl
 * @returns {Promise<FetchCampgroundContentResult>}
 */
async function fetchLegacyMergedContent(campground, { fetchImpl }) {
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

/**
 * Fetches readable text from a campground's configured official sources.
 * Multi-authority campgrounds fetch each source separately for per-source attribution.
 * Legacy campgrounds merge primary and supplemental URLs into one corpus.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {CampgroundSource[]} [options.sources]
 * @returns {Promise<FetchCampgroundContentResult>}
 */
export async function fetchCampgroundReadableText(campground, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch

  if (hasConfiguredSources(campground)) {
    const sources = options.sources ?? campground.sources
    return fetchMultiSourceContent(campground, sources, { fetchImpl })
  }

  return fetchLegacyMergedContent(campground, { fetchImpl })
}
