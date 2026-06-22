# Story 1: Template Inventory

Documentation of the Camp Scout AI routing and component structure as inherited from the SmartApp UI Kit template and extended for Epic CS-001.

## Routing

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Redirect | Redirects to `/campgrounds` |
| `/campgrounds` | `CampgroundsPage` | Browse real seed campgrounds with search and filters |
| `/campgrounds/:id` | `CampgroundDetailPage` | Campground detail with source links |
| `/settings` | `SettingsPage` | App preferences (placeholder) |

Defined in `src/App.jsx`. All routes render inside `AppShell` (sidebar + header layout).

## Layout

| Component | File | Role |
|-----------|------|------|
| `AppShell` | `src/components/AppShell.jsx` | Sidebar navigation, header, main content area |

## Campground UI (Epic CS-001)

| Component | File | Role |
|-----------|------|------|
| `AvailabilityNotice` | `src/components/AvailabilityNotice.jsx` | Banner stating live availability is not connected |
| `CampgroundCard` | `src/components/CampgroundCard.jsx` | Summary card for a single campground |
| `CampgroundFilters` | `src/components/CampgroundFilters.jsx` | Search by name/region and filter by amenities/tags |
| `CampgroundList` | `src/components/CampgroundList.jsx` | Grid of campground cards |

## Pages

| Page | File | Role |
|------|------|------|
| `CampgroundsPage` | `src/pages/CampgroundsPage.jsx` | Campground browser with filters |
| `CampgroundDetailPage` | `src/pages/CampgroundDetailPage.jsx` | Full detail view with source/reservation links |
| `SettingsPage` | `src/pages/SettingsPage.jsx` | Settings placeholder |

## Data Layer

| Module | File | Role |
|--------|------|------|
| Schema | `src/data/campgroundSchema.js` | Campground field definitions and validation |
| Seed data | `src/data/campgrounds.js` | Real Northern California campground records |
| Data access | `src/data/campgroundData.js` | Lookup, search, and filter helpers |

## Legacy Template Components (unused)

These components remain from the original job-search template and are not wired into current routes:

| Component | File |
|-----------|------|
| `JobsTable` | `src/components/JobsTable.jsx` |
| `QueueListPanel` | `src/components/QueueListPanel.jsx` |
| `SearchStatusBanner` | `src/components/SearchStatusBanner.jsx` |
| `ActivateSearchButton` | `src/components/ActivateSearchButton.jsx` |
| `StatusCards` | `src/components/StatusCards.jsx` |
| `StatusCard` | `src/components/StatusCard.jsx` |
| `ToastBanner` | `src/components/ToastBanner.jsx` |
| `DashboardPage` | `src/pages/DashboardPage.jsx` |

## Data Rules

- Seed data uses only real campgrounds with official `sourceUrl` values.
- No mock or invented availability data.
- Every card and detail page displays an "availability not connected" notice.
