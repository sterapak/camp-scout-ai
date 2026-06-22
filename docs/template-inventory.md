# Template Inventory

Concise map of the Camp Scout AI project structure (React + Vite SPA).

## App Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell; loads `/src/Index.jsx` |
| `src/Index.jsx` | React DOM mount (`StrictMode`) |
| `src/App.jsx` | Router root and route definitions |
| `src/main.jsx` | Alternate entry file (not wired in `index.html`) |

## Routing

Defined in `src/App.jsx` inside `BrowserRouter` (basename from `import.meta.env.BASE_URL`).

| Path | Page | Purpose |
|------|------|---------|
| `/` | redirect | → `/campgrounds` |
| `/campgrounds` | `CampgroundsPage` | Browse seed campgrounds |
| `/campgrounds/:id` | `CampgroundDetailPage` | Detail + source links |
| `/settings` | `SettingsPage` | Settings placeholder |

All routes render inside `AppShell`.

## Layout & Navigation

| Component | File | Role |
|-----------|------|------|
| `AppShell` | `src/components/AppShell.jsx` | Sidebar, header, `<main>` wrapper |

Nav links: **Browse Campgrounds** (`/campgrounds`), **Settings** (`/settings`).

## Pages

| Page | File |
|------|------|
| `CampgroundsPage` | `src/pages/CampgroundsPage.jsx` |
| `CampgroundDetailPage` | `src/pages/CampgroundDetailPage.jsx` |
| `SettingsPage` | `src/pages/SettingsPage.jsx` |
| `DashboardPage` | `src/pages/DashboardPage.jsx` *(legacy, not routed)* |

## Reusable UI Components

**Active (campground UI)**

| Component | File |
|-----------|------|
| `AvailabilityNotice` | `src/components/AvailabilityNotice.jsx` |
| `CampgroundCard` | `src/components/CampgroundCard.jsx` |
| `CampgroundFilters` | `src/components/CampgroundFilters.jsx` |
| `CampgroundList` | `src/components/CampgroundList.jsx` |

**Legacy (SmartApp template, not routed)**

| Component | File |
|-----------|------|
| `JobsTable` | `src/components/JobsTable.jsx` |
| `QueueListPanel` | `src/components/QueueListPanel.jsx` |
| `SearchStatusBanner` | `src/components/SearchStatusBanner.jsx` |
| `ActivateSearchButton` | `src/components/ActivateSearchButton.jsx` |
| `StatusCards` / `StatusCard` | `src/components/StatusCards.jsx`, `StatusCard.jsx` |
| `ToastBanner` | `src/components/ToastBanner.jsx` |

## Data Layer

| Module | File |
|--------|------|
| Schema | `src/data/campgroundSchema.js` |
| Seed data | `src/data/campgrounds.js` |
| Lookup/search | `src/data/campgroundData.js` |
| Legacy jobs API | `src/api/` (`jobsClient`, Supabase/Prisma adapters) |
| Legacy store | `src/store/useAppStore.js` |

## Test Setup

**Unit / integration (Jest + React Testing Library)**

- Config: `jest.config.js`, `jest.setup.js`, `babel.config.js`
- Run: `npm test` (includes coverage)
- Tests colocated as `*.test.js` / `*.test.jsx` next to source

**E2E (Cypress)**

- Config: `cypress.config.js` (`baseUrl: http://localhost:5173`)
- Specs: `cypress/e2e/`
- Run: `npm run cypress:run` (dev server required)

**Project verification**

- `./scripts/verify.sh` — lint, tests, and build in one command *(see Story CS-001.0)*

## Build & Deploy Notes

- Vite config: `vite.config.mjs` — dev base `/`, production base `/camp-scout-ai/`
- Production output: `docs/` (GitHub Pages)

## Future Cleanup

- Remove or archive unrouted legacy job-search components and `DashboardPage`
- Retire duplicate entry file `src/main.jsx`
- Consolidate with existing `docs/TEMPLATE_INVENTORY.md` if both docs are kept long-term
- Update stale Cypress specs that still target the old dashboard (`dashboard.cy.js`, `status-cards.cy.js`, etc.)
- `QueueListPanel` reads `s.queue` but store exposes `jobs` — latent bug in unused component
