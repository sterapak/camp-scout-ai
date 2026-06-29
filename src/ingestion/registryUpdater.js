// @ts-nocheck
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { KNOWLEDGE_DOCUMENT_TYPES } from '../data/knowledgeSchema.js'

const DOCUMENT_TYPE_RANK = Object.fromEntries(
  KNOWLEDGE_DOCUMENT_TYPES.map((documentType, index) => [documentType, index]),
)

const MULTI_SOURCE_FILE_PATTERN = /^(description|rules|reservation|alert)--source-(\d+)$/

/**
 * Converts a campground folder path into a camelCase import symbol.
 * @param {string} campgroundId
 * @param {string} documentType
 * @param {string | null} [sourcePriority]
 * @returns {string}
 */
export function toImportName(campgroundId, documentType, sourcePriority = null) {
  const campgroundPart = campgroundId
    .split('-')
    .map((segment, index) => (
      index === 0 ? segment : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    ))
    .join('')

  const typePart = `${documentType.charAt(0).toUpperCase()}${documentType.slice(1)}`
  const sourcePart = sourcePriority ? `Source${sourcePriority}` : ''

  return `${campgroundPart}${typePart}${sourcePart}`
}

/**
 * Parses a knowledge document filename into document type and optional source priority.
 * @param {string} fileStem
 * @returns {{ documentType: string, sourcePriority: string | null } | null}
 */
export function parseKnowledgeDocumentFileStem(fileStem) {
  if (KNOWLEDGE_DOCUMENT_TYPES.includes(fileStem)) {
    return {
      documentType: fileStem,
      sourcePriority: null,
    }
  }

  const match = fileStem.match(MULTI_SOURCE_FILE_PATTERN)
  if (!match) {
    return null
  }

  return {
    documentType: match[1],
    sourcePriority: match[2],
  }
}

/**
 * Discovers knowledge document modules under the campgrounds directory.
 * @param {string} knowledgeRoot
 * @returns {{ campgroundId: string, documentType: string, sourcePriority: string | null, relativeImportPath: string, importName: string }[]}
 */
export function discoverKnowledgeDocuments(knowledgeRoot) {
  const campgroundsDir = join(knowledgeRoot, 'campgrounds')
  const campgroundIds = readdirSync(campgroundsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const discovered = []

  for (const campgroundId of campgroundIds) {
    const campgroundDir = join(campgroundsDir, campgroundId)
    const parsedFiles = readdirSync(campgroundDir)
      .filter((fileName) => fileName.endsWith('.js'))
      .map((fileName) => fileName.replace(/\.js$/, ''))
      .map((fileStem) => parseKnowledgeDocumentFileStem(fileStem))
      .filter(Boolean)
      .sort((left, right) => {
        const leftRank = DOCUMENT_TYPE_RANK[left.documentType] ?? 99
        const rightRank = DOCUMENT_TYPE_RANK[right.documentType] ?? 99

        if (leftRank !== rightRank) {
          return leftRank - rightRank
        }

        const leftPriority = Number(left.sourcePriority ?? 0)
        const rightPriority = Number(right.sourcePriority ?? 0)
        return leftPriority - rightPriority
      })

    for (const parsed of parsedFiles) {
      const fileStem = parsed.sourcePriority
        ? `${parsed.documentType}--source-${parsed.sourcePriority}`
        : parsed.documentType

      discovered.push({
        campgroundId,
        documentType: parsed.documentType,
        sourcePriority: parsed.sourcePriority,
        relativeImportPath: `./campgrounds/${campgroundId}/${fileStem}.js`,
        importName: toImportName(campgroundId, parsed.documentType, parsed.sourcePriority),
      })
    }
  }

  return discovered
}

/**
 * Regenerates documents.js from files on disk.
 * @param {string} knowledgeRoot
 * @param {string} documentsFilePath
 */
export function updateDocumentsRegistry(knowledgeRoot, documentsFilePath) {
  const discovered = discoverKnowledgeDocuments(knowledgeRoot)

  const importLines = discovered.map(
    (entry) => `import ${entry.importName} from '${entry.relativeImportPath}'`,
  )

  const exportLines = discovered.map((entry) => `  ${entry.importName},`)

  const fileContents = [
    '/**',
    ' * Aggregates all campground knowledge documents from the repository.',
    ' * Register new documents here when adding campground folders.',
    ' * This file is auto-updated by `npm run ingest:campgrounds`.',
    ' */',
    '',
    "import { isValidKnowledgeDocument } from '../knowledgeSchema.js'",
    '',
    ...importLines,
    '',
    "/** @type {import('../knowledgeSchema.js').KnowledgeDocument[]} */",
    'export const knowledgeDocuments = [',
    ...exportLines,
    ']',
    '',
    '/**',
    ' * Returns all validated knowledge documents.',
    ' * @returns {import(\'../knowledgeSchema.js\').KnowledgeDocument[]}',
    ' */',
    'export function getAllKnowledgeDocuments() {',
    '  return knowledgeDocuments.filter((doc) => {',
    '    if (!isValidKnowledgeDocument(doc)) {',
    '      console.warn(`Invalid knowledge document skipped: ${doc?.id ?? \'unknown\'}`)',
    '      return false',
    '    }',
    '    return true',
    '  })',
    '}',
    '',
    '/**',
    ' * Returns unique campground IDs that have knowledge documents.',
    ' * @returns {string[]}',
    ' */',
    'export function getKnowledgeCampgroundIds() {',
    '  return [...new Set(getAllKnowledgeDocuments().map((doc) => doc.campgroundId))].sort()',
    '}',
    '',
  ].join('\n')

  writeFileSync(documentsFilePath, fileContents, 'utf8')
}
