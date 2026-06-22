# Campground Knowledge Repository

This directory stores official campground knowledge documents used by Camp Scout AI for search and retrieval. Documents are organized for future RAG expansion but do not use AI, embeddings, or vector databases.

## Repository Structure

```
src/data/knowledge/
├── README.md                 # Quick reference (this structure)
├── campgrounds/              # One folder per campground (matches seed id)
│   └── {campground-id}/
│       ├── description.js    # Campground overview from official sources
│       ├── rules.js          # Rules and policies
│       ├── reservation.js    # Booking and reservation details
│       └── alert.js          # Alerts and notices (optional)
├── documents.js              # Aggregates all knowledge documents
├── knowledgeIndex.js         # Searchable index builder
└── knowledgeRetrieval.js     # Retrieval service with relevance ordering
```

## Document Types

| Type | Purpose |
|------|---------|
| `description` | Campground overview, location, amenities, and context |
| `rules` | Rules, policies, pet restrictions, and quiet hours |
| `reservation` | How to book, reservation systems, and check-in details |
| `alert` | Temporary or seasonal alerts and safety notices |

See `src/data/knowledgeSchema.js` for the full schema definition.

## Adding Documents

1. Create a folder under `campgrounds/` named after the campground seed `id`.
2. Add one `.js` file per document type with a default export matching `KnowledgeDocument`.
3. Register the document in `documents.js`.
4. Run `./scripts/verify.sh` to validate schema and index integrity.

## Source Requirements

- Use official park or agency information only (NPS, California State Parks, etc.).
- Every document must include `sourceUrl` and `sourceName`.
- Do not invent facts or generate content — transcribe from official pages.
- No web scraping — content is manually curated from published official sources.

## Future Expansion

- Additional campground folders follow the same `{campground-id}/{documentType}.js` pattern.
- New document types require a schema update in `knowledgeSchema.js`.
- CS-003 will add embeddings and semantic retrieval on top of this repository.
