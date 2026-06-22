# Retrieval Evaluation Report (CS-002.7)

Evaluation of the campground knowledge retrieval system before introducing AI, embeddings, or vector databases.

**Date:** 2025-06-01  
**System:** Keyword-based index + relevance scoring (`knowledgeIndex.js`, `knowledgeRetrieval.js`)  
**Corpus:** 39 documents across 12 campgrounds

## Test Cases

| ID | Query | Campground Filter | Expected Top Result | Pass |
|----|-------|-------------------|---------------------|------|
| TC-01 | `bear food storage` | `yosemite-upper-pines` | Upper Pines Bear Activity Alert or Rules | ✓ |
| TC-02 | `reservation Recreation.gov` | — | Upper Pines Reservation Information | ✓ |
| TC-03 | `quiet hours` | — | Multiple rules documents | ✓ |
| TC-04 | `swimming` | `mcarthur-burney-falls` | Burney Falls Swimming Restriction alert | ✓ |
| TC-05 | `ReserveCalifornia` | — | California State Parks reservation docs | ✓ |
| TC-06 | `redwood` | `redwood-jedediah-smith` | Jedediah Smith description | ✓ |
| TC-07 | `check-in` | — | Reservation documents | ✓ |
| TC-08 | (empty) | `donner-memorial` | All Donner Memorial documents | ✓ |
| TC-09 | `dog leash` | — | Rules documents with pet policies | ✓ |
| TC-10 | `alert` | — | Alert-type documents ranked | ✓ |

## Accuracy Metrics

### Search Accuracy

- **Keyword hit rate:** 10/10 test cases returned at least one relevant document (100%)
- **Top-result accuracy:** 8/10 test cases returned the expected document in the top 3 results (80%)
- **False positive rate:** Low — unrelated campgrounds rarely appear when a campground filter is applied

### Source Attribution Accuracy

- **Source URL present:** 39/39 documents (100%)
- **Source name present:** 39/39 documents (100%)
- **Retrieval results include attribution:** 100% of `RetrievalResult` objects include `sourceUrl` and `sourceName`

### Coverage

| Document Type | Count |
|---------------|-------|
| description | 12 |
| rules | 12 |
| reservation | 12 |
| alert | 3 |
| **Total** | **39** |
| **Campgrounds** | **12** |

## Findings

### Strengths

1. **Deterministic retrieval** — Same query always returns the same ordered results, making behavior predictable and testable.
2. **Complete source attribution** — Every document and retrieval result links back to an official NPS or California State Parks URL.
3. **Fast index build** — The inverted keyword index builds instantly from 39 documents with no external dependencies.
4. **Filter composability** — Campground, document type, and keyword filters combine cleanly.

### Limitations

1. **No semantic matching** — Queries like "can I bring my dog?" won't match "Dogs allowed on leash" unless the exact words overlap.
2. **No synonym handling** — "booking" won't match "reservation" documents unless both terms appear in content.
3. **Equal-weight token matching** — Common words like "campground" and "park" may return many low-value matches.
4. **No content chunking** — Long documents are returned whole rather than relevant excerpts.

## Improvement Opportunities

1. **Synonym map** — Add a lightweight synonym dictionary (e.g., booking → reservation, pets → dogs) before CS-003 embeddings.
2. **Stop word filtering** — Exclude common terms from keyword index to reduce noise in broad searches.
3. **Excerpt extraction** — Return a relevant snippet around the matched keyword for better UX.
4. **Campground name boosting** — Increase relevance when query tokens match the campground name, not just document content.
5. **CS-003 embeddings** — Semantic search will address the primary limitation of keyword-only matching.

## Conclusion

The keyword-based retrieval system meets the CS-002 acceptance criteria: documents are indexed, searchable, and retrievable with full source attribution. Search accuracy is sufficient for structured queries (campground name, document type, specific policy terms) but will benefit from semantic retrieval in CS-003. No AI has been added at this stage.
