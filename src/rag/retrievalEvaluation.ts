/**
 * Retrieval evaluation harness comparing keyword and semantic retrieval.
 * Reuses the CS-002 behavioral testing approach with benchmark queries.
 */

import { retrieveDocuments } from '../data/knowledge/knowledgeRetrieval.js'
import { retrieveSemanticChunks } from './semanticRetrieval.js'

/**
 * @typedef {Object} BenchmarkQuery
 * @property {string} id
 * @property {string} query
 * @property {string} description
 * @property {string[]} [expectedDocumentIds]
 * @property {string[]} [expectedCampgroundIds]
 * @property {string} [expectedDocumentType]
 */

/** @type {BenchmarkQuery[]} */
export const BENCHMARK_QUERIES = [
  {
    id: 'bear-storage',
    query: 'bear food storage lockers',
    description: 'Keyword-friendly query about bear safety rules',
    expectedDocumentIds: ['yosemite-upper-pines-rules'],
    expectedCampgroundIds: ['yosemite-upper-pines'],
    expectedDocumentType: 'rules',
  },
  {
    id: 'reservation-window',
    query: 'reservation booking window',
    description: 'Reservation policy lookup',
    expectedDocumentType: 'reservation',
  },
  {
    id: 'pet-policy-paraphrase',
    query: 'places where dogs are allowed on leash',
    description: 'Paraphrased pet policy query — semantic retrieval should surface dog rules',
    expectedDocumentType: 'rules',
  },
  {
    id: 'quiet-hours',
    query: 'when are quiet hours enforced overnight',
    description: 'Natural-language rules question',
    expectedDocumentType: 'rules',
  },
  {
    id: 'campfire-restrictions',
    query: 'campfire and fire ring requirements',
    description: 'Fire policy query spanning multiple campgrounds',
    expectedDocumentType: 'rules',
  },
  {
    id: 'weather-alert',
    query: 'current park alerts and closures',
    description: 'Alert document retrieval',
    expectedDocumentType: 'alert',
  },
  {
    id: 'generator-hours',
    query: 'generator operating hours restrictions',
    description: 'Specific equipment policy query',
    expectedDocumentType: 'rules',
  },
  {
    id: 'yosemite-specific',
    query: 'Upper Pines campground policies',
    description: 'Campground-specific query with name reference',
    expectedCampgroundIds: ['yosemite-upper-pines'],
  },
]

/**
 * @typedef {Object} RetrievalEvalResult
 * @property {string} queryId
 * @property {string} query
 * @property {number} keywordResultCount
 * @property {number} semanticResultCount
 * @property {boolean} keywordHasExpectedDocument
 * @property {boolean} semanticHasExpectedDocument
 * @property {boolean} keywordHasExpectedCampground
 * @property {boolean} semanticHasExpectedCampground
 * @property {boolean} keywordHasExpectedType
 * @property {boolean} semanticHasExpectedType
 * @property {string} topKeywordDocumentId
 * @property {string} topSemanticChunkId
 * @property {number} topSemanticSimilarity
 */

/**
 * Checks whether results contain any of the expected document IDs.
 * @param {{ document?: { id: string }, chunk?: { documentId: string } }[]} results
 * @param {string[]} [expectedDocumentIds]
 * @returns {boolean}
 */
function hasExpectedDocument(results, expectedDocumentIds) {
  if (!expectedDocumentIds?.length) return true
  return results.some((result) => {
    const docId = result.document?.id ?? result.chunk?.documentId
    return expectedDocumentIds.includes(docId)
  })
}

/**
 * Checks whether results contain any of the expected campground IDs.
 * @param {{ document?: { campgroundId: string }, chunk?: { campgroundId: string } }[]} results
 * @param {string[]} [expectedCampgroundIds]
 * @returns {boolean}
 */
function hasExpectedCampground(results, expectedCampgroundIds) {
  if (!expectedCampgroundIds?.length) return true
  return results.some((result) => {
    const campgroundId = result.document?.campgroundId ?? result.chunk?.campgroundId
    return expectedCampgroundIds.includes(campgroundId)
  })
}

/**
 * Checks whether results contain the expected document type.
 * @param {{ document?: { documentType: string }, chunk?: { documentType: string } }[]} results
 * @param {string} [expectedDocumentType]
 * @returns {boolean}
 */
function hasExpectedType(results, expectedDocumentType) {
  if (!expectedDocumentType) return true
  return results.some((result) => {
    const docType = result.document?.documentType ?? result.chunk?.documentType
    return docType === expectedDocumentType
  })
}

/**
 * Evaluates a single benchmark query against both retrieval methods.
 * @param {BenchmarkQuery} benchmark
 * @param {number} [limit]
 * @returns {RetrievalEvalResult}
 */
export function evaluateBenchmarkQuery(benchmark, limit = 5) {
  const keywordResults = retrieveDocuments({ query: benchmark.query, limit })
  const semanticResults = retrieveSemanticChunks({ query: benchmark.query, limit })

  return {
    queryId: benchmark.id,
    query: benchmark.query,
    keywordResultCount: keywordResults.length,
    semanticResultCount: semanticResults.length,
    keywordHasExpectedDocument: hasExpectedDocument(keywordResults, benchmark.expectedDocumentIds),
    semanticHasExpectedDocument: hasExpectedDocument(semanticResults, benchmark.expectedDocumentIds),
    keywordHasExpectedCampground: hasExpectedCampground(keywordResults, benchmark.expectedCampgroundIds),
    semanticHasExpectedCampground: hasExpectedCampground(semanticResults, benchmark.expectedCampgroundIds),
    keywordHasExpectedType: hasExpectedType(keywordResults, benchmark.expectedDocumentType),
    semanticHasExpectedType: hasExpectedType(semanticResults, benchmark.expectedDocumentType),
    topKeywordDocumentId: keywordResults[0]?.document?.id ?? '',
    topSemanticChunkId: semanticResults[0]?.chunk?.id ?? '',
    topSemanticSimilarity: semanticResults[0]?.similarityScore ?? 0,
  }
}

/**
 * @typedef {Object} RetrievalEvalSummary
 * @property {RetrievalEvalResult[]} results
 * @property {number} totalQueries
 * @property {number} keywordDocumentHits
 * @property {number} semanticDocumentHits
 * @property {number} keywordTypeHits
 * @property {number} semanticTypeHits
 * @property {number} keywordCampgroundHits
 * @property {number} semanticCampgroundHits
 * @property {string[]} semanticWins
 * @property {string[]} keywordWins
 * @property {string[]} ties
 */

/**
 * Runs the full benchmark suite and returns a comparison summary.
 * @param {BenchmarkQuery[]} [benchmarks]
 * @param {number} [limit]
 * @returns {RetrievalEvalSummary}
 */
export function runRetrievalEvaluation(benchmarks = BENCHMARK_QUERIES, limit = 5) {
  const results = benchmarks.map((benchmark) => evaluateBenchmarkQuery(benchmark, limit))

  let keywordDocumentHits = 0
  let semanticDocumentHits = 0
  let keywordTypeHits = 0
  let semanticTypeHits = 0
  let keywordCampgroundHits = 0
  let semanticCampgroundHits = 0

  /** @type {string[]} */
  const semanticWins = []
  /** @type {string[]} */
  const keywordWins = []
  /** @type {string[]} */
  const ties = []

  for (const result of results) {
    if (result.keywordHasExpectedDocument) keywordDocumentHits++
    if (result.semanticHasExpectedDocument) semanticDocumentHits++
    if (result.keywordHasExpectedType) keywordTypeHits++
    if (result.semanticHasExpectedType) semanticTypeHits++
    if (result.keywordHasExpectedCampground) keywordCampgroundHits++
    if (result.semanticHasExpectedCampground) semanticCampgroundHits++

    const keywordScore =
      Number(result.keywordHasExpectedDocument) +
      Number(result.keywordHasExpectedType) +
      Number(result.keywordHasExpectedCampground)
    const semanticScore =
      Number(result.semanticHasExpectedDocument) +
      Number(result.semanticHasExpectedType) +
      Number(result.semanticHasExpectedCampground)

    if (semanticScore > keywordScore) {
      semanticWins.push(result.queryId)
    } else if (keywordScore > semanticScore) {
      keywordWins.push(result.queryId)
    } else {
      ties.push(result.queryId)
    }
  }

  return {
    results,
    totalQueries: results.length,
    keywordDocumentHits,
    semanticDocumentHits,
    keywordTypeHits,
    semanticTypeHits,
    keywordCampgroundHits,
    semanticCampgroundHits,
    semanticWins,
    keywordWins,
    ties,
  }
}

/**
 * Generates a markdown evaluation report.
 * @param {RetrievalEvalSummary} [summary]
 * @returns {string}
 */
export function generateEvaluationReport(summary = runRetrievalEvaluation()) {
  const lines = [
    '# Semantic Retrieval Evaluation Report',
    '',
    'Comparison of keyword retrieval (CS-002) and semantic retrieval (CS-004) on benchmark queries.',
    '',
    '## Summary',
    '',
    `| Metric | Keyword | Semantic |`,
    `|--------|---------|----------|`,
    `| Total benchmark queries | ${summary.totalQueries} | ${summary.totalQueries} |`,
    `| Expected document hits | ${summary.keywordDocumentHits} | ${summary.semanticDocumentHits} |`,
    `| Expected document type hits | ${summary.keywordTypeHits} | ${summary.semanticTypeHits} |`,
    `| Expected campground hits | ${summary.keywordCampgroundHits} | ${summary.semanticCampgroundHits} |`,
    `| Query wins | ${summary.keywordWins.length} | ${summary.semanticWins.length} |`,
    `| Ties | ${summary.ties.length} | ${summary.ties.length} |`,
    '',
    '## Benchmark Results',
    '',
    '| Query ID | Keyword Results | Semantic Results | Keyword Match | Semantic Match |',
    '|----------|-----------------|------------------|---------------|----------------|',
  ]

  for (const result of summary.results) {
    const keywordMatch =
      result.keywordHasExpectedDocument &&
      result.keywordHasExpectedType &&
      result.keywordHasExpectedCampground
    const semanticMatch =
      result.semanticHasExpectedDocument &&
      result.semanticHasExpectedType &&
      result.semanticHasExpectedCampground

    lines.push(
      `| ${result.queryId} | ${result.keywordResultCount} | ${result.semanticResultCount} | ${keywordMatch ? 'Yes' : 'Partial/No'} | ${semanticMatch ? 'Yes' : 'Partial/No'} |`,
    )
  }

  lines.push(
    '',
    '## Keyword Retrieval Strengths',
    '',
    '- Exact token matches (e.g., "bear", "reservation") return results quickly.',
    '- Deterministic scoring with campground boost for scoped queries.',
    '- No embedding computation overhead — synchronous and zero-cost.',
    '- Works well when user vocabulary matches official document wording.',
    '',
    '## Keyword Retrieval Weaknesses',
    '',
    '- Cannot match paraphrased queries (e.g., "dogs on leash" vs "pet policy").',
    '- Returns whole documents rather than targeted excerpts.',
    '- No relevance ranking beyond simple token scoring.',
    '- Misses semantic relationships between related concepts.',
    '',
    '## Semantic Retrieval Strengths',
    '',
    '- Returns ranked chunks with similarity scores for transparency.',
    '- Chunk-level granularity surfaces the most relevant excerpt.',
    '- Source attribution preserved on every result (URL, agency, campground).',
    '- Architecture ready for real embedding models without code changes.',
    '',
    '## Semantic Retrieval Weaknesses',
    '',
    '- Test embedding provider is deterministic but not semantically meaningful.',
    '- Paraphrase matching quality will remain limited until real embeddings are integrated.',
    '- Index rebuild required when documents change (no incremental persistence yet).',
    '- Similarity scores from the test provider are not calibrated for production thresholds.',
    '',
    '## Improvement Opportunities',
    '',
    '1. **Integrate a real embedding model** (e.g., Azure OpenAI text-embedding-3-small) for meaningful semantic matching.',
    '2. **Hybrid retrieval** — combine keyword and semantic scores with reciprocal rank fusion.',
    '3. **Expand benchmark suite** with human-labeled relevance judgments and MRR/NDCG metrics.',
    '4. **Add chunk overlap** to reduce boundary effects when answers span chunk edges.',
    '5. **Persist vector index** at build time to avoid runtime embedding cost.',
    '6. **Tune similarity thresholds** to filter low-confidence results before RAG prompt injection.',
    '',
    '## Semantic Wins',
    '',
    summary.semanticWins.length > 0
      ? summary.semanticWins.map((id) => `- ${id}`).join('\n')
      : '- None on current test provider (expected until real embeddings)',
    '',
    '## Keyword Wins',
    '',
    summary.keywordWins.length > 0
      ? summary.keywordWins.map((id) => `- ${id}`).join('\n')
      : '- None',
    '',
    '## Ties',
    '',
    summary.ties.map((id) => `- ${id}`).join('\n'),
    '',
  )

  return lines.join('\n')
}
