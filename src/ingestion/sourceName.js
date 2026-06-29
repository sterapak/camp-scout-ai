// @ts-nocheck
/**
 * Derives a publisher name from an official source URL.
 * @param {string} sourceUrl
 * @returns {string}
 */
export function deriveSourceName(sourceUrl) {
  let hostname = ''

  try {
    hostname = new URL(sourceUrl).hostname.toLowerCase()
  } catch {
    return 'Official Source'
  }

  if (hostname.endsWith('nps.gov')) {
    return 'National Park Service'
  }

  if (hostname.endsWith('parks.ca.gov')) {
    return 'California State Parks'
  }

  if (hostname.endsWith('recreation.gov')) {
    return 'Recreation.gov'
  }

  if (hostname.endsWith('reservecalifornia.com')) {
    return 'ReserveCalifornia'
  }

  if (hostname.endsWith('eid.org')) {
    return 'El Dorado Irrigation District'
  }

  if (hostname.endsWith('pge.com') || hostname.endsWith('recreation.pge.com')) {
    return 'Pacific Gas and Electric Company'
  }

  if (hostname.endsWith('fs.usda.gov')) {
    return 'U.S. Forest Service'
  }

  return 'Official Source'
}

/**
 * Resolves the display name for a configured source, preferring explicit names.
 * @param {import('../data/campgroundSchema.js').CampgroundSource} source
 * @returns {string}
 */
export function resolveSourceName(source) {
  if (source.name?.trim()) {
    return source.name.trim()
  }

  return deriveSourceName(source.url)
}
