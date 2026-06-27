/** @jest-environment node */

import { resolveKnowledgeSnapshot, buildDocumentFingerprint } from './knowledgeSnapshot.js'

describe('knowledgeSnapshot', () => {
  it('resolves Yosemite snapshot from ingestion manifest', () => {
    const snapshot = resolveKnowledgeSnapshot('yosemite-upper-pines')

    expect(snapshot).not.toBeNull()
    expect(snapshot?.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(snapshot?.id).toBe(snapshot?.contentHash)
    expect(snapshot?.sourceName).toBeTruthy()
    expect(snapshot?.lastFetchedAt).toBeTruthy()
  })

  it('builds a stable document fingerprint for campgrounds with knowledge', () => {
    const first = buildDocumentFingerprint('silver-lake-west')
    const second = buildDocumentFingerprint('silver-lake-west')

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns null for campgrounds without knowledge documents', () => {
    expect(resolveKnowledgeSnapshot('unknown-campground')).toBeNull()
  })
})
