# Campground Knowledge Ingestion

Automated pipeline for downloading official campground source pages and generating structured knowledge documents consumed by Camp Scout AI retrieval.

## Command

```bash
npm run ingest:campgrounds
```

Ingest a specific campground:

```bash
npm run ingest:campgrounds -- --campground mount-tamalpais-pantoll
```

## What It Does

1. Reads campground definitions from `src/data/campgrounds.js`.
2. Fetches each configured official `sourceUrl`.
3. Extracts readable page content while removing navigation, headers, footers, and unrelated elements.
4. Categorizes content into knowledge document types:
   - `description`
   - `rules`
   - `reservation`
   - `alert` (only when alert content is detected)
5. Writes JS modules to `src/data/knowledge/campgrounds/{campground-id}/{documentType}.js`.
6. Updates `src/data/knowledge/documents.js` automatically.
7. Records ingestion metadata in `src/data/knowledge/ingestion-manifest.json`:
   - `sourceUrl`
   - `sourceName`
   - `lastFetchedAt`
   - `contentHash`

Generated knowledge documents preserve stable IDs (`{campground-id}-{documentType}`) and populate `lastUpdatedAt` when source content changes.

## Configure Campgrounds To Ingest

By default, `npm run ingest:campgrounds` processes every campground in `src/data/campgrounds.js`. The default ID list is defined in `src/ingestion/ingestionConfig.js`:

```js
export const INGESTION_CAMPGROUND_IDS = campgrounds.map((campground) => campground.id)
```

To ingest a single campground instead:

```bash
npm run ingest:campgrounds -- --campground donner-memorial
```

Each campground ID must exist in `src/data/campgrounds.js` and must use an official agency source URL.

### Supplemental official sources

Some campgrounds merge additional official pages during ingestion (for example, Yosemite bear safety policy). Configure these in `src/ingestion/ingestionConfig.js`:

```js
export const INGESTION_SUPPLEMENTAL_SOURCES = {
  'yosemite-upper-pines': [
    'https://www.nps.gov/yose/planyourvisit/bears.htm',
  ],
}
```

## Change Detection

The pipeline computes a SHA-256 hash of normalized extracted source text. If the hash matches the value stored in `ingestion-manifest.json`, file regeneration is skipped. Running ingestion twice against unchanged source content produces no file differences.

## Error Handling

Ingestion logs progress per campground and continues when individual sources fail. Common failures include:

- Invalid source URLs
- HTTP errors (404, 500, etc.)
- Network timeouts
- Empty or unreadable extracted content

Failed campgrounds do not stop the rest of the run.

## Refresh Workflow

1. Confirm official `sourceUrl` values in `src/data/campgrounds.js` when adding campgrounds.
2. Run `npm run ingest:campgrounds` to refresh the full catalog.
3. Review generated files under `src/data/knowledge/campgrounds/`.
4. Commit updated knowledge files and `ingestion-manifest.json`.

## Tests

Unit tests cover parsing, categorization, document generation, change detection, and pipeline behavior:

```bash
npm test -- src/ingestion
```

## Related Files

| File | Purpose |
|------|---------|
| `scripts/ingest-campgrounds.mjs` | CLI entry point |
| `src/ingestion/pipeline.js` | Orchestration and file writes |
| `src/ingestion/extractContent.js` | HTML extraction |
| `src/ingestion/categorizeContent.js` | Document type categorization |
| `src/ingestion/generateDocuments.js` | Knowledge document generation |
| `src/ingestion/manifest.js` | Change detection metadata |
| `src/data/knowledge/ingestion-manifest.json` | Per-campground fetch metadata |
