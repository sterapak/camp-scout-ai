/**
 * Knowledge document schema for Camp Scout AI.
 *
 * Stores campground knowledge sourced from official park and agency pages.
 * No AI, embeddings, or vector database — plain structured documents only.
 */

export const KNOWLEDGE_DOCUMENT_TYPES = [
  'description',
  'rules',
  'reservation',
  'alert',
] as const

export type KnowledgeDocumentType = (typeof KNOWLEDGE_DOCUMENT_TYPES)[number]

export const KNOWLEDGE_DOCUMENT_FIELDS = [
  'id',
  'campgroundId',
  'title',
  'documentType',
  'content',
  'sourceUrl',
  'sourceName',
  'lastUpdatedAt',
] as const

export interface KnowledgeDocument {
  id: string
  campgroundId: string
  title: string
  documentType: KnowledgeDocumentType
  content: string
  sourceUrl: string
  sourceName: string
  lastUpdatedAt: string
}

export function isValidKnowledgeDocument(document: unknown): document is KnowledgeDocument {
  if (!document || typeof document !== 'object') return false

  const record = document as Record<string, unknown>
  const requiredStrings = [
    'id',
    'campgroundId',
    'title',
    'documentType',
    'content',
    'sourceUrl',
    'sourceName',
    'lastUpdatedAt',
  ]

  for (const field of requiredStrings) {
    if (typeof record[field] !== 'string' || (record[field] as string).trim() === '') {
      return false
    }
  }

  if (!KNOWLEDGE_DOCUMENT_TYPES.includes(record.documentType as KnowledgeDocumentType)) {
    return false
  }

  try {
    new URL(record.sourceUrl as string)
  } catch {
    return false
  }

  return !Number.isNaN(Date.parse(record.lastUpdatedAt as string))
}

export function getDocumentTypeLabel(documentType: KnowledgeDocumentType | string): string {
  const labels: Record<KnowledgeDocumentType, string> = {
    description: 'Description',
    rules: 'Rules & Policies',
    reservation: 'Reservation Information',
    alert: 'Alerts & Notices',
  }

  return labels[documentType] ?? documentType
}
