import {
  BENCHMARK_QUERIES,
  evaluateBenchmarkQuery,
  generateEvaluationReport,
  runRetrievalEvaluation,
} from './retrievalEvaluation'
import { resetSemanticIndex } from './semanticRetrieval'

describe('retrievalEvaluation', () => {
  beforeEach(() => {
    resetSemanticIndex()
  })

  it('defines benchmark queries with required fields', () => {
    expect(BENCHMARK_QUERIES.length).toBeGreaterThanOrEqual(5)

    BENCHMARK_QUERIES.forEach((benchmark) => {
      expect(benchmark.id).toBeTruthy()
      expect(benchmark.query.trim().length).toBeGreaterThan(0)
      expect(benchmark.description).toBeTruthy()
    })
  })

  it('evaluates a single benchmark query against both methods', () => {
    const benchmark = BENCHMARK_QUERIES[0]
    const result = evaluateBenchmarkQuery(benchmark)

    expect(result.queryId).toBe(benchmark.id)
    expect(result.query).toBe(benchmark.query)
    expect(result.keywordResultCount).toBeGreaterThanOrEqual(0)
    expect(result.semanticResultCount).toBeGreaterThanOrEqual(0)
    expect(typeof result.topSemanticSimilarity).toBe('number')
  })

  it('runs the full evaluation suite and returns a summary', () => {
    const summary = runRetrievalEvaluation()

    expect(summary.totalQueries).toBe(BENCHMARK_QUERIES.length)
    expect(summary.results).toHaveLength(BENCHMARK_QUERIES.length)
    expect(summary.keywordWins.length + summary.semanticWins.length + summary.ties.length).toBe(
      summary.totalQueries,
    )
  })

  it('generates a markdown evaluation report', () => {
    const report = generateEvaluationReport()

    expect(report).toContain('# Semantic Retrieval Evaluation Report')
    expect(report).toContain('## Keyword Retrieval Strengths')
    expect(report).toContain('## Semantic Retrieval Strengths')
    expect(report).toContain('## Improvement Opportunities')
    expect(report).toContain('Benchmark Results')
  })

  it('measures retrieval quality with expected document type hits', () => {
    const reservationBenchmark = BENCHMARK_QUERIES.find((b) => b.id === 'reservation-window')
    const result = evaluateBenchmarkQuery(reservationBenchmark)

    expect(result.keywordHasExpectedType || result.semanticHasExpectedType).toBe(true)
  })

  it('documents comparison between keyword and semantic retrieval', () => {
    const summary = runRetrievalEvaluation()
    const report = generateEvaluationReport(summary)

    expect(report).toContain('Keyword Retrieval Weaknesses')
    expect(report).toContain('Semantic Retrieval Weaknesses')
    expect(report).toContain('| Metric | Keyword | Semantic |')
  })
})
