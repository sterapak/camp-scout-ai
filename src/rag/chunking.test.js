import fs from 'fs'
import path from 'path'

import { getAllKnowledgeDocuments } from '../data/knowledge/documents'
import { isValidKnowledgeDocument } from '../data/knowledgeSchema'
import {
  buildChunkId,
  buildChunkText,
  chunkAllKnowledgeDocuments,
  chunkKnowledgeDocument,
  splitDocumentContent,
} from './chunking'

const CHUNKING_SOURCE = fs.readFileSync(path.join(__dirname, 'chunking.ts'), 'utf8')

describe('chunking module', () => {
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

  it('does not import campground seed modules', () => {
    expect(CHUNKING_SOURCE).not.toMatch(/campgrounds\.js/)
    expect(CHUNKING_SOURCE).not.toMatch(/campgroundData\.js/)
  })

  it('builds stable chunk IDs', () => {
    expect(buildChunkId('yosemite-upper-pines-description', 0)).toBe(
      'yosemite-upper-pines-description::chunk-0',
    )
    expect(buildChunkId('yosemite-upper-pines-description', 1)).toBe(
      'yosemite-upper-pines-description::chunk-1',
    )
  })

  it('builds chunk text with document context', () => {
    expect(buildChunkText(validDocument, validDocument.content)).toBe(
      'Test Campground Overview (description): Official campground description from park sources.',
    )
  })

  it('returns no chunks for invalid documents', () => {
    expect(chunkKnowledgeDocument(null)).toEqual([])
    expect(chunkKnowledgeDocument({ ...validDocument, sourceUrl: 'not-a-url' })).toEqual([])
    expect(chunkKnowledgeDocument({ ...validDocument, documentType: 'unknown' })).toEqual([])
  })

  it('returns no chunks for empty document content', () => {
    expect(chunkKnowledgeDocument({ ...validDocument, content: '' })).toEqual([])
    expect(chunkKnowledgeDocument({ ...validDocument, content: '   \n\n   ' })).toEqual([])
    expect(splitDocumentContent('')).toEqual([])
    expect(splitDocumentContent('   ')).toEqual([])
  })

  it('creates one chunk for short content', () => {
    const chunks = chunkKnowledgeDocument(validDocument)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      id: 'test-campground-description::chunk-0',
      documentId: 'test-campground-description',
      title: validDocument.title,
      campgroundId: validDocument.campgroundId,
      documentType: validDocument.documentType,
      sourceUrl: validDocument.sourceUrl,
      sourceName: validDocument.sourceName,
      lastUpdatedAt: validDocument.lastUpdatedAt,
      chunkIndex: 0,
      text: buildChunkText(validDocument, validDocument.content),
    })
  })

  it('splits long content into multiple stable chunks', () => {
    const paragraphOne = 'A'.repeat(500)
    const paragraphTwo = 'B'.repeat(500)
    const document = {
      ...validDocument,
      content: `${paragraphOne}\n\n${paragraphTwo}`,
    }

    const firstRun = chunkKnowledgeDocument(document)
    const secondRun = chunkKnowledgeDocument(document)

    expect(firstRun.length).toBeGreaterThan(1)
    expect(firstRun.map((chunk) => chunk.id)).toEqual(secondRun.map((chunk) => chunk.id))
    firstRun.forEach((chunk, index) => {
      expect(chunk.documentId).toBe(document.id)
      expect(chunk.chunkIndex).toBe(index)
      expect(chunk.text).toContain(document.title)
    })
  })

  it('generates chunks from CS-002 knowledge documents with required metadata', () => {
    const chunks = chunkAllKnowledgeDocuments()

    expect(chunks.length).toBeGreaterThan(0)

    chunks.forEach((chunk) => {
      expect(chunk.id).toMatch(/^[\w-]+::chunk-\d+$/)
      expect(chunk.documentId).toEqual(expect.any(String))
      expect(chunk.title.trim().length).toBeGreaterThan(0)
      expect(chunk.campgroundId.trim().length).toBeGreaterThan(0)
      expect(['description', 'rules', 'reservation', 'alert']).toContain(chunk.documentType)
      expect(chunk.sourceUrl).toMatch(/^https:\/\//)
      expect(chunk.sourceName.trim().length).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(chunk.lastUpdatedAt))).toBe(false)
      expect(chunk.text.trim().length).toBeGreaterThan(0)
    })
  })

  it('produces stable chunk IDs across repeated runs', () => {
    const firstRun = chunkAllKnowledgeDocuments().map((chunk) => chunk.id)
    const secondRun = chunkAllKnowledgeDocuments().map((chunk) => chunk.id)

    expect(firstRun).toEqual(secondRun)
  })

  it('chunks only validated knowledge documents from the repository', () => {
    const documents = getAllKnowledgeDocuments()

    documents.forEach((document) => {
      expect(isValidKnowledgeDocument(document)).toBe(true)
    })

    expect(chunkAllKnowledgeDocuments(documents).length).toBeGreaterThan(0)
    expect(chunkAllKnowledgeDocuments([...documents, { id: 'bad' }])).toEqual(
      chunkAllKnowledgeDocuments(documents),
    )
  })
})
