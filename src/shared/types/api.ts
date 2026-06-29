/**
 * Shared API request/response types for Camp Scout AI.
 * Imported by both frontend clients and backend handlers.
 */

export type AnswerConfidenceLevel = 'high' | 'medium' | 'low'

export type QueryIntent = 'factual' | 'ratings_opinion' | 'comparison' | 'recommendation'

export interface Citation {
  id: string
  title: string
  sourceName: string
  sourceUrl: string
  campgroundName?: string
  documentType: string
}

export interface Evidence {
  citationId: string
  citationIndex: number
  excerpt: string
  sourceName: string
  sourceUrl: string
  title: string
  campgroundName?: string
  documentType: string
}

export interface GroundingMetrics {
  coverageRatio: number
  warnings: string[]
}

export interface ContradictionConflictSource {
  sourceName: string
  sourceUrl: string
  statement: string
  citationId: string
}

export interface ContradictionWarning {
  topic: string
  message: string
  conflictingSources: ContradictionConflictSource[]
}

export interface UniqueSourceReference {
  sourceName: string
  sourceUrl: string
  authorityRank: number
}

export interface AskRequest {
  question: string
  campgroundId?: string
  documentType?: string
  topDocumentCount?: number
}

export interface AskSuccessResponse {
  status: 'success'
  answer: string
  citations: Citation[]
  model: string
  inputTokens?: number
  outputTokens?: number
  confidence: AnswerConfidenceLevel
  sources: UniqueSourceReference[]
  evidence: Evidence[]
  intent: QueryIntent
  contradictionWarning?: ContradictionWarning | null
  groundingMetrics?: GroundingMetrics
}

export interface AskInsufficientResponse {
  status: 'insufficient_context'
  message: string
  citations: Citation[]
}

export type AskResponse = AskSuccessResponse | AskInsufficientResponse

export interface SummarySectionContent {
  overview: string
  amenities: string
  restrictions: string
  reservations: string
  highlights: string
}

export interface KnowledgeSnapshotRef {
  id: string
  contentHash: string
  lastFetchedAt?: string
  sourceName?: string
}

export interface SummaryRequest {
  campgroundId: string
  forceRegenerate?: boolean
}

export interface SummarySuccessResponse {
  status: 'success'
  campgroundId: string
  campgroundName: string
  sections: SummarySectionContent
  citations: Citation[]
  sources: UniqueSourceReference[]
  evidence: Evidence[]
  confidence: AnswerConfidenceLevel
  model: string
  inputTokens?: number
  outputTokens?: number
  generatedAt?: string
  knowledgeSnapshot?: KnowledgeSnapshotRef
  cached?: boolean
}

export interface SummaryInsufficientResponse {
  status: 'insufficient_context'
  message: string
  campgroundId: string
}

export type SummaryResponse = SummarySuccessResponse | SummaryInsufficientResponse

export interface ApiErrorResponse {
  error: string
}
