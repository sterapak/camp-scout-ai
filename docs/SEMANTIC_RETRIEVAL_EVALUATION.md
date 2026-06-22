# Semantic Retrieval Evaluation Report

Comparison of keyword retrieval (CS-002) and semantic retrieval (CS-004) on benchmark queries.

## Summary

| Metric | Keyword | Semantic |
|--------|---------|----------|
| Total benchmark queries | 8 | 8 |
| Expected document hits | 8 | 7 |
| Expected document type hits | 7 | 7 |
| Expected campground hits | 8 | 7 |
| Query wins | 2 | 1 |
| Ties | 5 | 5 |

## Benchmark Results

| Query ID | Keyword Results | Semantic Results | Keyword Match | Semantic Match |
|----------|-----------------|------------------|---------------|----------------|
| bear-storage | 5 | 5 | Yes | Partial/No |
| reservation-window | 5 | 5 | Yes | Yes |
| pet-policy-paraphrase | 5 | 5 | Yes | Yes |
| quiet-hours | 5 | 5 | Yes | Partial/No |
| campfire-restrictions | 5 | 5 | Yes | Yes |
| weather-alert | 5 | 5 | Partial/No | Yes |
| generator-hours | 5 | 5 | Yes | Yes |
| yosemite-specific | 5 | 5 | Yes | Yes |

## Keyword Retrieval Strengths

- Exact token matches (e.g., "bear", "reservation") return results quickly.
- Deterministic scoring with campground boost for scoped queries.
- No embedding computation overhead — synchronous and zero-cost.
- Works well when user vocabulary matches official document wording.

## Keyword Retrieval Weaknesses

- Cannot match paraphrased queries (e.g., "dogs on leash" vs "pet policy").
- Returns whole documents rather than targeted excerpts.
- No relevance ranking beyond simple token scoring.
- Misses semantic relationships between related concepts.

## Semantic Retrieval Strengths

- Returns ranked chunks with similarity scores for transparency.
- Chunk-level granularity surfaces the most relevant excerpt.
- Source attribution preserved on every result (URL, agency, campground).
- Architecture ready for real embedding models without code changes.

## Semantic Retrieval Weaknesses

- Test embedding provider is deterministic but not semantically meaningful.
- Paraphrase matching quality will remain limited until real embeddings are integrated.
- Index rebuild required when documents change (no incremental persistence yet).
- Similarity scores from the test provider are not calibrated for production thresholds.

## Improvement Opportunities

1. **Integrate a real embedding model** (e.g., Azure OpenAI text-embedding-3-small) for meaningful semantic matching.
2. **Hybrid retrieval** — combine keyword and semantic scores with reciprocal rank fusion.
3. **Expand benchmark suite** with human-labeled relevance judgments and MRR/NDCG metrics.
4. **Add chunk overlap** to reduce boundary effects when answers span chunk edges.
5. **Persist vector index** at build time to avoid runtime embedding cost.
6. **Tune similarity thresholds** to filter low-confidence results before RAG prompt injection.

## Semantic Wins

- weather-alert

## Keyword Wins

- bear-storage
- quiet-hours

## Ties

- reservation-window
- pet-policy-paraphrase
- campfire-restrictions
- generator-hours
- yosemite-specific
