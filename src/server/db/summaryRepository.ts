/**
 * Durable storage for generated campground AI summaries, backed by SQLite so
 * they survive restarts and deploys.
 *
 * Before this, summaries lived only in an in-memory Map: every deploy discarded
 * all of them and the next visitor paid full generation latency and cost again.
 * Same reasoning as budgetRepository — the single-instance in-memory copy was
 * never the right home for something we pay per unit to produce.
 *
 * Keyed on (campground_id, snapshot_id). The snapshot id is what makes
 * invalidation automatic: when a campground's knowledge changes its snapshot id
 * changes, the old row stops matching, and a fresh summary is generated.
 */
import { and, eq } from 'drizzle-orm'

import { getDb, type Db } from './index.js'
import { campgroundSummaries } from './schema.js'

export interface StoredSummary {
  campgroundId: string
  /** KnowledgeSnapshot — shape owned by the rag layer, passed through verbatim. */
  knowledgeSnapshot: { id: string } & Record<string, unknown>
  generatedAt: string
  /** CampgroundSummarySuccess — shape owned by the rag layer. */
  summary: Record<string, unknown>
}

export function readStoredSummary(
  campgroundId: string,
  snapshotId: string,
  db: Db = getDb(),
): StoredSummary | undefined {
  const rows = db
    .select()
    .from(campgroundSummaries)
    .where(
      and(
        eq(campgroundSummaries.campgroundId, campgroundId),
        eq(campgroundSummaries.snapshotId, snapshotId),
      ),
    )
    .limit(1)
    .all()

  const row = rows[0]
  if (!row) return undefined

  // A row that will not parse is a MISS, not a crash and not a silent empty
  // summary. Returning undefined regenerates it; swallowing the error and
  // returning a blank summary would render an empty card that looks generated.
  try {
    return {
      campgroundId: row.campgroundId,
      knowledgeSnapshot: JSON.parse(row.knowledgeSnapshotJson),
      generatedAt: row.generatedAt,
      summary: JSON.parse(row.summaryJson),
    }
  } catch (error) {
    console.warn(
      `[summaryRepository] unreadable summary row for ${campgroundId}:${snapshotId}; regenerating`,
      error,
    )
    return undefined
  }
}

export function writeStoredSummary(entry: StoredSummary, db: Db = getDb()): void {
  const nowIso = new Date().toISOString()
  db.insert(campgroundSummaries)
    .values({
      campgroundId: entry.campgroundId,
      snapshotId: entry.knowledgeSnapshot.id,
      summaryJson: JSON.stringify(entry.summary),
      knowledgeSnapshotJson: JSON.stringify(entry.knowledgeSnapshot),
      generatedAt: entry.generatedAt,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: [campgroundSummaries.campgroundId, campgroundSummaries.snapshotId],
      set: {
        summaryJson: JSON.stringify(entry.summary),
        knowledgeSnapshotJson: JSON.stringify(entry.knowledgeSnapshot),
        generatedAt: entry.generatedAt,
        updatedAt: nowIso,
      },
    })
    .run()
}

/** Test helper — mirrors __resetBudgetForTests. */
export function __resetSummariesForTests(db: Db = getDb()): void {
  db.delete(campgroundSummaries).run()
}
