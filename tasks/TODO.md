# Phase 3 Execution TODO

Created: 2026-03-27
Status: Planning complete, implementation pending

## Objective

Deliver Phase 3 browse improvements as a sequence of implementable sub-phases that can be executed in separate sessions without reopening `tasks/SPEC.md`.

## Execution Order

- `3A` blocks `3B`.
- `3A` and `3B` block `3C`.
- `3A` blocks `3D`.
- `3D` should land after the public and dashboard query contracts are settled.

## Locked Decisions

- `tasks/TODO.md` is the active standalone execution document for Phase 3.
- `tasks/SPEC.md` remains the concise phase summary and tracker.
- Phase 3 is a browse/discovery enhancement phase, not a public detail-page build phase.
- `/listings` uses URL-driven, server-rendered browse state from `searchParams`.
- Public `/listings` defaults to `status=active`.
- Public status tabs are locked to:
  - `active`
  - `scheduled`
  - `ended`
- `/dashboard/listings` keeps its existing seller status tabs:
  - `draft`
  - `active`
  - `scheduled`
  - `ended`
- `/dashboard/listings` adopts shared pagination only; it does not adopt the public filter/search controls row.
- Navbar search is always visible.
- On desktop, the navbar search sits centered between the brand and the right-side nav/account controls.
- On smaller screens, the navbar search moves to a full-width second row and remains visible.
- Navbar search submits only on:
  - Enter key
  - search button click
- Navbar search does not debounce or auto-submit while typing.
- Searching from a non-`/listings` route navigates to `/listings?q=...`.
- Searching from `/listings` preserves the current `status`, `category`, `price`, `sort`, and `pageSize`, and resets `page=1`.
- Empty search input falls back to browse behavior.
- On `/listings`, status, category, price, sort, search, and page-size changes all reset `page=1`.
- Filter dropdowns and sort apply immediately on selection change.
- Reset clears:
  - `category`
  - `price`
  - `sort`
- Reset preserves:
  - `status`
  - `q`
  - `pageSize`
- Reset always sets `page=1`.
- Pagination is offset-based and URL-driven through `page` and `pageSize`.
- Shared page-size options are locked to:
  - `6`
  - `12`
  - `18`
  - `24`
- Phase 3 price filtering and sorting use `startingBidCents`.
- `sort=most_bids` exists in the UI and URL contract during Phase 3.
- `sort=most_bids` is a temporary no-op in Phase 3 and must resolve to the same ordering as `sort=newest` until Phase 4 adds real bid persistence.
- Search matching is simple case-insensitive contains matching against `title` and `description`.
- Phase 3 does not add full-text search, tokenization, stemming, debounce, or auto-search.
- Sticky pagination is sticky to the bottom of the page content area, not the viewport root.
- The immediate follow-up session for this work is docs-only: update planning docs now, do not implement product code in this change.

## Shared Interfaces And Rules

### Seed target

- Expand seed data from `10` listings to exactly `20`.
- Distribute sellers `8 / 6 / 6` across Bob, Alice, and Charlie.
- Lock status distribution to:
  - `9 active`
  - `4 scheduled`
  - `4 ended`
  - `3 draft`
- Bob should own `7` active listings so both `/listings` and `/dashboard/listings?status=active` exercise pagination with `pageSize=6`.
- Every seeded listing gets exactly one main image.
- Seed image URLs use stable picsum seeds in the format:
  - `https://picsum.photos/seed/<slug>/1200/900`
- Titles and image slugs should be chosen together so each picsum image is at least plausibly aligned with the listing.
- Seed data should cover the listing category and condition enums broadly enough to support realistic visual testing across multiple combinations.
- At least `4` seeded listings must have future `startsAt` values and `status=scheduled`.
- At least `4` seeded listings must have past `endsAt` values and `status=ended`.
- Active listings must have future `endsAt` values.
- Draft listings remain present for seller dashboard coverage only and never appear on public `/listings`.

### Shared browse query/result contract

- Add a typed public listings query parser/normalizer.
- Add a typed dashboard listings query parser/normalizer.
- Public `/listings` query params:
  - `status=active|scheduled|ended`
  - `q=<string>`
  - `category=<listing category enum>`
  - `price=lt_10|lt_50|lt_100|lt_500`
  - `sort=newest|ending_soonest|most_bids|price_asc|price_desc`
  - `page=<1-based integer>`
  - `pageSize=6|12|18|24`
- Dashboard `/dashboard/listings` query params:
  - `status=draft|active|scheduled|ended`
  - `page=<1-based integer>`
  - `pageSize=6|12|18|24`
- Public invalid or missing values normalize to:
  - `status=active`
  - empty `q`
  - no category filter
  - no price filter
  - `sort=newest`
  - `page=1`
  - `pageSize=6`
- Dashboard invalid or missing values normalize to:
  - `status=draft`
  - `page=1`
  - `pageSize=6`
- Search input is trimmed before query normalization.
- An empty trimmed search string means “no search filter.”
- Listing query results for public and dashboard pages must return:
  - paginated items
  - `totalCount`
  - enough page/window metadata for the shared pagination component
- Public browse queries must never return draft listings.
- Public browse status filtering is exact by selected status.

### Shared search and sort rules

- Search uses simple case-insensitive `LIKE`/contains matching against:
  - `listing.title`
  - `listing.description`
- Search does not tokenize, stem, or use SQLite FTS in Phase 3.
- Stable sort rules for offset pagination are locked to:
  - `newest`: `createdAt desc`
  - `ending_soonest`: `endsAt asc`, then `createdAt desc`
  - `most_bids`: same ordering as `newest` during Phase 3
  - `price_asc`: `startingBidCents asc`, then `createdAt desc`
  - `price_desc`: `startingBidCents desc`, then `createdAt desc`
- Price filter options map to `startingBidCents` thresholds:
  - `lt_10`
  - `lt_50`
  - `lt_100`
  - `lt_500`

### Shared UI contract

- Add a reusable public listings controls row for `/listings`.
- The controls row sits on a single row below the page heading.
- Controls row layout is locked to:
  - left: public status tabs
  - right: category dropdown, price dropdown, sort dropdown, reset button
- Add a listings-aware navbar search component used by `SiteHeader`.
- Add a reusable shared pagination component used by:
  - `/listings`
  - `/dashboard/listings`
- Shared pagination layout is locked to:
  - left: result count text
  - center: shadcn-style pagination controls
  - right: four page-size buttons

### Shared behavior

- All browse state is URL-driven through `searchParams`.
- Changing status, category, price, sort, search, or page size resets `page=1`.
- Page links preserve the rest of the active query state.
- Result count format is `start-end of total`.
- Empty-state count format is `0-0 of 0`.
- Partial final pages must use the true ending record number.
- `/dashboard/listings` keeps its seller status tabs above the results grid and adopts pagination beneath the results only.

## 3A - Seed Data and Status Tabs

Status: Implemented on 2026-03-27

### Deliverables

- Seed data expanded from `10` listings to `20`.
- Seed data covers a wider range of categories and conditions for realistic UI testing.
- Public `/listings` gets URL-backed status tabs:
  - `Active`
  - `Scheduled`
  - `Ended`
- Existing dashboard seller tabs remain intact.
- Public listings query contract is finalized around status filtering and pagination-ready results.

### Implementation tasks

- Update the seed plan in the implementation docs to expand the dataset and lock the exact seller and status distribution from the shared rules section.
- Require at least `4` scheduled listings with future `startsAt`.
- Require at least `4` ended listings with past `endsAt`.
- Keep active listings with future `endsAt`.
- Keep some draft listings for seller dashboard coverage.
- Document that `/listings` filters by exact public status and never includes drafts.
- Document that invalid public `status` values fall back to `active`.
- Document that public status tabs are URL-backed and rendered below the `/listings` page heading.
- Document that `/dashboard/listings` keeps its existing seller-status tab behavior unchanged during 3A.
- Require the query-layer work for 3A to return both filtered results and `totalCount` so 3D can build on the same contract without reshaping it.

### Test tasks

- Seed smoke-check expectations for:
  - total listing count
  - counts by status
  - counts by seller
  - Bob active-listing count
- Integration tests for public status-tab query behavior.
- Integration tests for invalid public `status` normalization to `active`.
- Integration tests proving dashboard seller tabs remain unchanged.

### Exit criteria

- Seed data supports realistic visual testing for status tabs and future pagination.
- `/listings` switches correctly among active, scheduled, and ended results by URL state.
- `/dashboard/listings` continues to work with `draft`, `active`, `scheduled`, and `ended` tabs.

## 3B - Filter Dropdowns & Sort

Status: Not started

### Deliverables

- `/listings` gets a single controls row below the heading.
- The right side of the row contains:
  - category dropdown
  - price dropdown
  - sort dropdown
  - reset button
- Public listings query contract expands to support category, price, and sort.

### Implementation tasks

- Lock category options to `All Categories` plus every existing `listingCategories` enum value rendered with user-facing labels.
- Lock price options to:
  - `Any Price`
  - `< $10`
  - `< $50`
  - `< $100`
  - `< $500`
- Lock sort options to:
  - `Newest`
  - `Ending Soonest`
  - `Most Bids`
  - `Price Low→High`
  - `Price High→Low`
- Document that the price filter uses `startingBidCents`.
- Document that category and price filters combine with the selected status and any active search query.
- Document that filter and sort changes apply immediately on selection change and reset `page=1`.
- Document that reset preserves:
  - `status`
  - `q`
  - `pageSize`
- Document that reset clears:
  - `category`
  - `price`
  - `sort`
- Document that reset always returns `page=1`.
- Call out explicitly that `Most Bids` is a temporary no-op in Phase 3 and resolves to the same ordering as `Newest`.
- Document that invalid category, price, and sort values are ignored and normalized back to defaults.

### Test tasks

- Unit tests for public query-param parsing and normalization.
- Unit tests for category, price, and sort mapping helpers.
- Integration tests for category filtering.
- Integration tests for price filtering.
- Integration tests for each real sort mode.
- Integration test proving `sort=most_bids` resolves to the default ordering during Phase 3.

### Exit criteria

- `/listings` supports status, category, price, and sort in combination.
- Reset produces the locked preservation and clearing behavior.
- The implementation docs leave no ambiguity about how `Most Bids` behaves before Phase 4.

## 3C - Search

Status: Not started

### Deliverables

- Navbar search is centered and always visible.
- Search submit behavior works on `/listings` and from any other page.
- Search applies to listing title and description with simple contains matching only.

### Implementation tasks

- Document the desktop header layout with the search centered between the brand area and the right-side nav/account controls.
- Document the mobile header layout with the search moved to a full-width second row while remaining visible.
- Lock search form behavior to:
  - Enter key submits
  - search button click submits
  - no debounce
  - no auto-submit while typing
- Lock route behavior so that, on `/listings`, search submit updates `q`, preserves current public browse state, and resets `page=1`.
- Lock route behavior so that, from any non-`/listings` route, search submit navigates to:
  - `/listings?q=<term>` when the trimmed query is non-empty
  - `/listings` when the trimmed query is empty
- Document that search matching is case-insensitive `LIKE` against `title` and `description`.
- Document that empty search falls back to browse behavior.
- Document that search combines with status, category, price, sort, and pagination rules on `/listings`.

### Test tasks

- App-level tests for header search rendering.
- App-level tests for explicit submit behavior.
- Integration tests for search query filtering against titles.
- Integration tests for search query filtering against descriptions.
- Integration tests for search combined with status and filters.
- Integration tests for non-`/listings` search redirect behavior.

### Exit criteria

- Search is always visible in the header.
- Search runs only on explicit submit.
- `/listings` can refine results with `q` plus active filters and sort.

## 3D - Pagination

Status: Not started

### Deliverables

- Shared pagination component used by `/listings` and `/dashboard/listings`.
- Sticky bottom pagination layout with result count, controls, and page-size buttons.
- Offset-based pagination that respects all active query state.

### Implementation tasks

- Lock the shared pagination layout to:
  - left: result count text
  - center: shadcn-style pagination controls
  - right: four page-size buttons for `6`, `12`, `18`, and `24`
- Document that page-size changes update `pageSize` and reset `page=1`.
- Document that previous, next, and page-number links preserve the rest of the active query state.
- Require both public and dashboard listing queries to return:
  - paginated items
  - `totalCount`
  - page/window metadata required by the shared component
- Document sticky placement at the bottom of each page content section so pagination stays visible while scrolling long result lists.
- Document empty and partial-page cases:
  - no results render `0-0 of 0`
  - the last page uses the true ending number
- Document that `/dashboard/listings` adopts pagination only and keeps existing seller status tabs above the results grid.

### Test tasks

- Unit tests for offset and page-window calculations.
- Unit tests for result-count formatting.
- Integration tests for `/listings` pagination preserving search, filter, and sort state.
- Integration tests for `/dashboard/listings` pagination preserving seller status.
- App-level tests for page-size selection behavior.
- App-level tests for sticky pagination rendering hooks if practical.

### Exit criteria

- Both pages use the same pagination component and query contract.
- Pagination respects all active filters, search, sort, and seller status.
- Page-size changes and page navigation are deterministic and URL-driven.

## Final Verification Checklist

- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Completion Notes

- Update `tasks/SPEC.md` tracker checkboxes as the Phase 3 query contract, seed work, sub-phases, and tests land.
- Keep `tasks/TODO.md` self-sufficient; future implementation sessions should not need to reopen `tasks/SPEC.md` for execution details.
- If Phase 3 scope changes, update this file before coding so later sessions inherit the current source of truth.
