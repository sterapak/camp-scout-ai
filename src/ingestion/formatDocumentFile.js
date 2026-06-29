// @ts-nocheck
/**
 * Escapes content for use inside a JS template literal.
 * @param {string} content
 * @returns {string}
 */
export function escapeTemplateLiteral(content) {
  return content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/**
 * Formats a knowledge document as a deterministic JS module string.
 * @param {import('../data/knowledgeSchema.js').KnowledgeDocument} document
 * @returns {string}
 */
export function formatKnowledgeDocumentFile(document) {
  const lines = [
    "/** @type {import('../../knowledgeSchema.js').KnowledgeDocument} */",
    'export default {',
    `  id: '${document.id}',`,
    `  campgroundId: '${document.campgroundId}',`,
    `  title: '${escapeSingleQuoted(document.title)}',`,
    `  documentType: '${document.documentType}',`,
    `  content: \`${escapeTemplateLiteral(document.content)}\`,`,
    `  sourceUrl: '${escapeSingleQuoted(document.sourceUrl)}',`,
    `  sourceName: '${escapeSingleQuoted(document.sourceName)}',`,
    `  lastUpdatedAt: '${document.lastUpdatedAt}',`,
    '}',
    '',
  ]

  return lines.join('\n')
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeSingleQuoted(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
