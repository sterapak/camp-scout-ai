import {
  isValidKnowledgeDocument,
  KNOWLEDGE_DOCUMENT_FIELDS,
  KNOWLEDGE_DOCUMENT_TYPES,
  getDocumentTypeLabel,
} from './knowledgeSchema'
import { getAllKnowledgeDocuments, getKnowledgeCampgroundIds } from './knowledge/documents'
import { campgrounds } from './campgrounds'

describe('knowledgeSchema', () => {
  const validDocument = {
    id: 'test-campground-description',
    campgroundId: 'test-campground',
    title: 'Test Campground Overview',
    documentType: 'description',
    content: 'Official campground description from park sources.',
    sourceUrl: 'https://www.nps.gov/test/planyourvisit/campground.htm',
    sourceName: 'National Park Service',
    lastUpdatedAt: '2025-06-01',
  }

  it('defines all required fields', () => {
    expect(KNOWLEDGE_DOCUMENT_FIELDS).toEqual([
      'id',
      'campgroundId',
      'title',
      'documentType',
      'content',
      'sourceUrl',
      'sourceName',
      'lastUpdatedAt',
    ])
  })

  it('defines all document types', () => {
    expect(KNOWLEDGE_DOCUMENT_TYPES).toEqual([
      'description',
      'rules',
      'reservation',
      'alert',
    ])
  })

  it('validates a correct document', () => {
    expect(isValidKnowledgeDocument(validDocument)).toBe(true)
  })

  it('rejects documents with missing content', () => {
    expect(isValidKnowledgeDocument({ ...validDocument, content: '' })).toBe(false)
  })

  it('rejects documents with invalid document type', () => {
    expect(isValidKnowledgeDocument({ ...validDocument, documentType: 'unknown' })).toBe(false)
  })

  it('rejects documents with invalid source URL', () => {
    expect(isValidKnowledgeDocument({ ...validDocument, sourceUrl: 'not-a-url' })).toBe(false)
  })

  it('returns human-readable document type labels', () => {
    expect(getDocumentTypeLabel('description')).toBe('Description')
    expect(getDocumentTypeLabel('rules')).toBe('Rules & Policies')
    expect(getDocumentTypeLabel('reservation')).toBe('Reservation Information')
    expect(getDocumentTypeLabel('alert')).toBe('Alerts & Notices')
  })
})

describe('knowledge seed documents', () => {
  it('contains documents for every seed campground', () => {
    const documents = getAllKnowledgeDocuments()
    const campgroundIds = new Set(documents.map((doc) => doc.campgroundId))

    expect(campgroundIds.size).toBe(campgrounds.length)
    expect(getKnowledgeCampgroundIds()).toHaveLength(campgrounds.length)

    campgrounds.forEach((campground) => {
      expect(campgroundIds.has(campground.id)).toBe(true)
    })
  })

  it('every document passes schema validation', () => {
    getAllKnowledgeDocuments().forEach((doc) => {
      expect(isValidKnowledgeDocument(doc)).toBe(true)
    })
  })

  it('every document includes source attribution', () => {
    getAllKnowledgeDocuments().forEach((doc) => {
      expect(doc.sourceUrl).toMatch(/^https:\/\//)
      expect(doc.sourceName.trim().length).toBeGreaterThan(0)
    })
  })
})
