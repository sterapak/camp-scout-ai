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

  return 'Official Source'
}
