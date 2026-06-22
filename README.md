# Camp Scout AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Camp Scout AI** helps campers discover real Northern California campgrounds using verified seed data from official park and agency sources.

## Epic CS-001: Real Seed Foundation

This epic establishes the real-data foundation for Camp Scout AI:

| Story | Status | Description |
|-------|--------|-------------|
| 1. Template Inventory | Done | Routing and component documentation in `docs/TEMPLATE_INVENTORY.md` |
| 2. Rebrand | Done | Camp Scout AI branding throughout the app |
| 3. Real Campground Seed Schema | Done | Schema in `src/data/campgroundSchema.js` |
| 4. Add Real Seed Campgrounds | Done | 20 real NorCal campgrounds in `src/data/campgrounds.js` |
| 5. Campground Browser | Done | Browse page at `/campgrounds` |
| 6. Search and Filters | Done | Search by name/region; filter by amenities and tags |
| 7. Detail Page With Sources | Done | Detail pages with official source and reservation links |
| 8. Availability Not Connected | Done | Notice on every card and detail page |

### Data rules

- **No mock campground data** — seed records use real parks with official `sourceUrl` values.
- **No invented availability** — live booking is not connected; users are directed to official portals.

## Getting Started

```bash
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

**GitHub Pages:** [https://sterapak.github.io/camp-scout-ai/campgrounds](https://sterapak.github.io/camp-scout-ai/campgrounds)

> The old `/smartapp-ui-kit/` URL is no longer valid. Use `/camp-scout-ai/` on GitHub Pages or `/campgrounds` locally.

## Testing

```bash
npm test
npm run cypress:run   # requires dev server running
```

## Project Structure

See `docs/TEMPLATE_INVENTORY.md` for the full routing and component inventory.

## Built With

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Jest](https://jestjs.io/) + [Cypress](https://www.cypress.io/)
