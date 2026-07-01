#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildAbsoluteUrl,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteOrigin,
} from './sitemapUtils.mjs'

const outDir = process.env.TERAPAK_SITEMAP_OUT_DIR ?? 'terapak-static'
const siteOrigin = resolveSiteOrigin({
  siteUrl: process.env.TERAPAK_SITE_URL ?? 'https://terapak.com',
  defaultSiteUrl: 'https://terapak.com',
})

/** Public pages on terapak.com (SPA routes served from the main site). */
const publicEntries = [
  { pathname: '/', changefreq: 'weekly', priority: 1.0 },
  { pathname: '/projects', changefreq: 'monthly', priority: 0.9 },
  { pathname: '/about', changefreq: 'monthly', priority: 0.8 },
]

const sitemapXml = buildSitemapXml(publicEntries, siteOrigin, '')
const sitemapUrl = buildAbsoluteUrl(siteOrigin, '', '/sitemap.xml')
const robotsTxt = buildRobotsTxt({
  sitemapUrl,
  disallow: ['/api/', '/admin/'],
})

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'sitemap.xml'), sitemapXml, 'utf8')
writeFileSync(join(outDir, 'robots.txt'), robotsTxt, 'utf8')

console.log(`Generated Terapak sitemap with ${publicEntries.length} URLs at ${join(outDir, 'sitemap.xml')}`)
console.log(`Generated Terapak robots.txt at ${join(outDir, 'robots.txt')}`)
