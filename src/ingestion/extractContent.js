import { parse } from 'node-html-parser'

const REMOVED_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '.nav',
  '.navbar',
  '.navigation',
  '.breadcrumb',
  '.breadcrumbs',
  '.site-header',
  '.site-footer',
  '.footer',
  '.header',
  '.sidebar',
  '.social',
  '.share',
  '.cookie',
  '.skip-link',
  '#header',
  '#footer',
  '#navigation',
  '#nav',
  '#sidebar',
]

const CONTENT_ROOT_SELECTORS = [
  'div.m',
  '#content',
  '#main-content',
  '.page-content',
  '.main-content',
  '.content-main',
  '.park-content',
  '.article-content',
  'main',
  'article',
  'body',
]

const BLOCK_TAGS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'DIV'])

/**
 * Decodes common HTML entities in text nodes.
 * @param {string} text
 * @returns {string}
 */
export function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

/**
 * Normalizes a text fragment extracted from HTML.
 * @param {string} text
 * @returns {string}
 */
export function normalizeParagraphText(text) {
  return decodeHtmlEntities(
    text
      .replace(/\.([A-Z])/g, '. $1')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

/**
 * Converts HTML into normalized plain text paragraphs.
 * @param {string} html
 * @returns {string[]}
 */
export function extractParagraphsFromHtml(html) {
  const root = parse(html, {
    blockTextElements: {
      script: false,
      noscript: false,
      style: false,
    },
  })

  for (const selector of REMOVED_SELECTORS) {
    root.querySelectorAll(selector).forEach((node) => node.remove())
  }

  const contentRoot = selectContentRoot(root)
  const paragraphs = extractParagraphsFromNode(contentRoot)

  return dedupeParagraphs(paragraphs)
}

/**
 * Joins extracted paragraphs into a single normalized text blob.
 * @param {string} html
 * @returns {string}
 */
export function extractReadableText(html) {
  return extractParagraphsFromHtml(html).join('\n\n')
}

/**
 * Selects the DOM subtree that contains the most useful page content.
 * @param {import('node-html-parser').HTMLElement} root
 * @returns {import('node-html-parser').HTMLElement}
 */
export function selectContentRoot(root) {
  let bestNode = root
  let bestScore = 0

  for (const selector of CONTENT_ROOT_SELECTORS) {
    root.querySelectorAll(selector).forEach((candidate) => {
      const paragraphs = extractParagraphsFromNode(candidate)
      const score = scoreParagraphs(paragraphs)

      if (score > bestScore) {
        bestScore = score
        bestNode = candidate
      }
    })
  }

  return bestNode
}

/**
 * @param {import('node-html-parser').HTMLElement} node
 * @returns {string[]}
 */
function extractParagraphsFromNode(node) {
  const paragraphs = []
  let buffer = ''

  const flushBuffer = () => {
    const normalized = normalizeParagraphText(buffer)
    if (normalized.length >= 20) {
      paragraphs.push(normalized)
    }
    buffer = ''
  }

  const walk = (currentNode) => {
    if (!currentNode) return

    if (currentNode.nodeType === 3) {
      buffer += currentNode.rawText
      return
    }

    if (currentNode.tagName && BLOCK_TAGS.has(currentNode.tagName.toUpperCase())) {
      flushBuffer()
    }

    currentNode.childNodes.forEach(walk)

    if (currentNode.tagName && BLOCK_TAGS.has(currentNode.tagName.toUpperCase())) {
      flushBuffer()
    }
  }

  walk(node)
  flushBuffer()

  return paragraphs
}

/**
 * @param {string[]} paragraphs
 * @returns {number}
 */
function scoreParagraphs(paragraphs) {
  return paragraphs.reduce((score, paragraph) => score + paragraph.length, 0)
}

/**
 * @param {string[]} paragraphs
 * @returns {string[]}
 */
function dedupeParagraphs(paragraphs) {
  const seen = new Set()
  const unique = []

  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(paragraph)
  }

  return unique
}
