/**
 * Shared utilities for generating sitemap.xml and robots.txt.
 */

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Normalizes a base path such as "/" or "/camp-scout-ai/" to "" or "/camp-scout-ai".
 * @param {string | undefined} basePath
 * @returns {string}
 */
export function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return ''
  }

  const trimmed = basePath.replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Resolves the public site origin used in sitemap URLs.
 * @param {{
 *   siteUrl?: string
 *   appUrl?: string
 *   basePath?: string
 *   defaultSiteUrl?: string
 * }} options
 * @returns {string}
 */
export function resolveSiteOrigin({
  siteUrl,
  appUrl,
  basePath = '',
  defaultSiteUrl = 'https://campscout.terapak.com',
}) {
  if (siteUrl) {
    return siteUrl.replace(/\/+$/, '')
  }

  if (appUrl) {
    return appUrl.replace(/\/+$/, '')
  }

  const normalizedBase = normalizeBasePath(basePath)
  if (normalizedBase === '/camp-scout-ai') {
    return 'https://sterapak.github.io'
  }

  return defaultSiteUrl.replace(/\/+$/, '')
}

/**
 * Builds an absolute URL for a sitemap entry.
 * @param {string} siteOrigin
 * @param {string} basePath
 * @param {string} pathname
 * @returns {string}
 */
export function buildAbsoluteUrl(siteOrigin, basePath, pathname) {
  const normalizedOrigin = siteOrigin.replace(/\/+$/, '')
  const normalizedBase = normalizeBasePath(basePath)
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (normalizedPath === '/') {
    return `${normalizedOrigin}${normalizedBase || '/'}`.replace(/([^:]\/)\/+/g, '$1')
  }

  return `${normalizedOrigin}${normalizedBase}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1')
}

/**
 * @typedef {Object} SitemapEntry
 * @property {string} pathname
 * @property {string} [lastmod]
 * @property {string} [changefreq]
 * @property {number} [priority]
 */

/**
 * @param {SitemapEntry[]} entries
 * @param {string} siteOrigin
 * @param {string} basePath
 * @returns {string}
 */
export function buildSitemapXml(entries, siteOrigin, basePath) {
  const urlEntries = entries
    .map(({ pathname, lastmod, changefreq, priority }) => {
      const loc = escapeXml(buildAbsoluteUrl(siteOrigin, basePath, pathname))
      const lines = [`    <url>`, `      <loc>${loc}</loc>`]

      if (lastmod) {
        lines.push(`      <lastmod>${escapeXml(lastmod)}</lastmod>`)
      }

      if (changefreq) {
        lines.push(`      <changefreq>${escapeXml(changefreq)}</changefreq>`)
      }

      if (priority !== undefined) {
        lines.push(`      <priority>${priority.toFixed(1)}</priority>`)
      }

      lines.push('    </url>')
      return lines.join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    '</urlset>',
    '',
  ].join('\n')
}

/**
 * @param {{
 *   sitemapUrl: string
 *   allow?: string[]
 *   disallow?: string[]
 * }} options
 * @returns {string}
 */
export function buildRobotsTxt({ sitemapUrl, allow = ['/'], disallow = [] }) {
  const lines = ['User-agent: *']

  for (const path of allow) {
    lines.push(`Allow: ${path}`)
  }

  for (const path of disallow) {
    lines.push(`Disallow: ${path}`)
  }

  lines.push('', `Sitemap: ${sitemapUrl}`, '')
  return lines.join('\n')
}

/**
 * @param {string} dateValue
 * @returns {string | undefined}
 */
export function toSitemapDate(dateValue) {
  if (!dateValue) {
    return undefined
  }

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString().slice(0, 10)
}
