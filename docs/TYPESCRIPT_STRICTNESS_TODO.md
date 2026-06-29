# TypeScript Strictness Roadmap

The incremental TypeScript migration starts with practical compiler settings so existing JavaScript can be checked without blocking feature work. Tighten options in separate PRs as modules gain explicit types.

## Current settings (practical migration baseline)

- `strict: false`
- `noImplicitAny: false`
- `noUncheckedIndexedAccess: false`
- `exactOptionalPropertyTypes: false`
- `allowJs: true` — existing `.js`/`.jsx` files remain checkable during migration
- `checkJs: true` — surface type issues in JavaScript without renaming files first

## Known typecheck exclusions

These paths are excluded from `tsc` during the incremental migration (see `tsconfig.json`):

- `src/data/knowledge/campgrounds/**` — generated campground data (validated via `documents.ts`)
- `src/data/campgroundSchema.js` — legacy schema module (convert in a follow-up PR)
- Test files (`*.test.js`, `*.test.jsx`)

## Planned strictness increases (one PR each)

| PR | Option | Benefit |
|----|--------|---------|
| 1 | `strict: true` | Enables strictNullChecks, strictFunctionTypes, and related checks |
| 2 | `noImplicitAny: true` | Requires explicit types on untyped parameters and variables |
| 3 | `noUncheckedIndexedAccess: true` | Index signatures return `T \| undefined` |
| 4 | `exactOptionalPropertyTypes: true` | Distinguishes missing vs explicitly `undefined` optional props |

## After migration stabilizes

- Evaluate removing `allowJs` once all source modules are `.ts`/`.tsx`
- Remove redundant JSDoc `@typedef` blocks replaced by shared `.ts` types
- Keep `noEmit: true` while Vite handles bundling; TypeScript is used for type-checking only
