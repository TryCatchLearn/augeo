# Augeo Auction Platform Specification

Created: 2026-03-21
Status: Active working spec

## Purpose

This document is the living technical specification and delivery tracker for building Augeo into a simplified eBay-style auction platform.

It is intended to:

- define the product scope and technical direction
- break the work into implementation phases
- capture acceptance criteria before code is written
- track progress as phases move from spec to implementation to acceptance

Authentication is already implemented with BetterAuth and is treated as project baseline, not a tracked delivery phase.

## Product Goals

- Allow authenticated users to create auction listings with photos and auction settings.
- Allow buyers to browse, search, watch, and bid on listings.
- Keep auction state accurate, transparent, and testable.
- Add practical AI features that assist sellers without removing manual control.
- Maintain a high quality bar through Vitest-based unit and integration testing.

## Non-Goals

The following are explicitly out of scope for the initial learning project:

- payments and checkout
- shipping flows and label generation
- seller fees, tax, or invoicing
- dispute resolution or returns
- proxy bidding / max auto-bid logic
- multi-currency support
- external marketplace syndication

## Baseline Repository Notes

- Framework: Next.js 16 App Router
- Language: TypeScript
- Auth: BetterAuth with email/password already implemented
- Database: SQLite-compatible database access through Drizzle ORM and `@libsql/client`
- Forms: React Hook Form with Zod
- UI: Tailwind CSS v4 with shadcn-style component structure
- Tests: Vitest already present with a starter jsdom setup

## Technical Direction

### Architecture

- Use App Router with server components by default.
- Use client components only for interactive UI such as forms, live bid panels, image upload previews, and AI-assisted editing.
- Prefer server actions for authenticated mutations initiated from forms.
- Use route handlers for streaming, cron/webhook-style jobs, and machine-consumable APIs.
- Keep domain logic in reusable server-side modules rather than embedding business rules in page files.

### Data Storage

- Local development database remains SQLite/libSQL-compatible.
- Drizzle ORM is the source of truth for schema, relations, and migrations.
- Auction money values will be stored as integer cents to avoid floating point issues.
- Phase 7 will switch the production deployment target to a hosted database with the smallest possible application-layer change.
- Preferred production path: hosted libSQL/Turso to preserve SQLite compatibility and reduce migration complexity.

### File Storage

- Listing photos will use a storage adapter abstraction backed by Cloudinary from Phase 1 onward.
- Development may use Cloudinary directly with a dedicated dev folder or account.
- Tests should use a mock storage adapter; Vitest must not upload real assets.
- Only file metadata and canonical URLs are stored in the database.

### Real-Time Updates

- Live auction updates will be implemented through Ably on a listing-level channel.
- Server-side bid and auction events will publish to Ably after a successful transaction.
- Fallback behavior: client polling and router refresh if the real-time transport is temporarily unavailable.
- Bid placement must still remain correct even if live updates are unavailable.

### Background Jobs

- Scheduled auction activation and auction closure will be handled by an idempotent server-side lifecycle job.
- Local development can trigger lifecycle processing manually.
- Production scheduling will use cron-job.org to hit a protected API endpoint that activates due scheduled listings and finalizes expired auctions.

### AI Integration

- AI features will be implemented through the Vercel AI SDK.
- AI output must always be schema-validated with Zod before it can populate the UI.
- AI suggestions are assistive only; users retain full edit and publish control.
- Prompt inputs and outputs should be logged only as needed for debugging and never treated as trusted source-of-truth data.

## Quality and Testing Standards

### Coverage Gates

- Every phase must include comprehensive unit and integration tests before acceptance.
- Minimum acceptance target per phase: 80% coverage for new or materially changed domain code.
- Coverage should be enforced for statements, branches, functions, and lines wherever practical.
- A phase is not accepted if it lowers the overall quality bar or leaves major branches untested.

### Critical Path Integration Coverage

The following workflows are considered critical and require 100% integration coverage of success paths and business-rule failure paths once their phase is delivered:

- listing creation and publication
- listing editing and photo persistence
- valid bid placement
- invalid bid rejection
- auction finalization with winner
- auction finalization without winner
- reserve-price-not-met finalization

### Test Strategy

- `tests/unit/` for validators, formatting helpers, auction rules, AI result parsing, search query mapping, and notification formatting.
- `tests/integration/` for server actions, route handlers, DB-backed workflows, page-level access control, and end-to-end feature slices within the app boundary.
- Use a dedicated test database per suite or per worker with migrations applied before tests run.
- Add factories and fixtures for users, listings, bids, watches, and notifications.
- Mock time for auction end and scheduling logic.
- Mock storage and AI providers in tests; do not call live external services from Vitest.

## Domain Model

The exact schema will be finalized during the detailed spec step for each phase, but the working domain model is:

### Core Tables

- `user`
  - Existing BetterAuth user table.
- `listing`
  - `id`
  - `sellerId`
  - `title`
  - `description`
  - `category` enum
    - `electronics`
    - `fashion`
    - `home_garden`
    - `collectibles`
    - `art`
    - `jewelry_watches`
    - `toys_hobbies`
    - `sports_outdoors`
    - `media`
    - `other`
  - `condition` enum
    - `new`
    - `like_new`
    - `good`
    - `fair`
    - `poor`
  - `startingBidCents`
  - `reservePriceCents` nullable
  - `currentBidCents` nullable cached value
  - `startsAt` nullable
  - `endsAt` required, default `createdAt + 7 days`
  - `status` enum
    - `draft`
    - `scheduled`
    - `active`
    - `ended`
  - `outcome` nullable enum
    - `sold`
    - `unsold`
    - `reserve_not_met`
  - `winnerUserId` nullable
  - `winningBidId` nullable
  - `createdAt`
  - `updatedAt`
- `listingImage`
  - `id`
  - `listingId`
  - `publicId`
  - `url`
  - `isMain`
  - `createdAt`
- `bid`
  - `id`
  - `listingId`
  - `bidderId`
  - `amountCents`
  - `createdAt`
- `watch`
  - `id`
  - `listingId`
  - `userId`
  - `createdAt`
  - unique on `listingId + userId`
- `notification`
  - `id`
  - `userId`
  - `type`
  - `payload`
  - `readAt` nullable
  - `createdAt`

### Suggested Listing Status Values

- `draft`
- `active`
- `scheduled`
- `ended`

### Business Rules

- Only authenticated users can create, edit, bid, watch, or view personal dashboards.
- A seller cannot bid on their own listing.
- A listing can receive bids only while `status = active` and `endsAt > now`.
- New bids must be greater than or equal to the starting bid if no bids exist.
- Once a listing has bids, each new bid must be at least the current highest bid plus the tiered minimum increment.
- Bid increments are tiered based on the current highest bid; the exact tiers will be finalized in the detailed Phase 4 spec before implementation.
- Reserve price is hidden from buyers and only affects auction finalization.
- Sellers can edit listings only while the listing is in `draft` status.
- A listing can be moved back to `draft` only if it is currently `scheduled` or `active` and has received no bids.
- Ties are resolved by earliest accepted bid.
- Auction finalization must be transactional and idempotent.

## UI and Route Plan

Planned app surfaces:

- `/sell`
  - listing creation and seller management entry point
- `/listings`
  - public browse and search page
- `/listings/[id]`
  - listing details, bid history summary, watch action, live updates
- `/dashboard`
  - user overview shell
- `/dashboard/listings`
  - seller listings management view if needed
- `/dashboard/bids`
  - user bidding history and live positions if needed
- `/dashboard/watching`
  - watched auctions
- internal routes for live updates, upload handling, auction finalization, and notification delivery

Detailed routing may be adjusted during phase-level spec approval, but the public listing details route is required by Phase 4.

## Phase Workflow

Every phase follows the same lifecycle:

1. Detailed phase spec reviewed and approved in this document.
2. Schema, routes, UI, and test plan finalized.
3. Implementation completed.
4. Unit and integration tests added.
5. Coverage thresholds met.
6. Phase accepted and tracker updated.

## Master Tracker

- [x] Phase 0 - Testing/foundation setup
- [x] Phase 1 - Listing Creation and Management
- [ ] Phase 2 - AI Features
- [ ] Phase 3 - Browse and Search Listings
- [ ] Phase 4 - Bidding and Real-Time Updates
- [ ] Phase 5 - Auction Finalization and Notifications
- [ ] Phase 6 - User Dashboard
- [ ] Phase 7 - Polish, CI, Prod DB switch and publishing

## Phase 0 - Testing/Foundation Setup

Objective: establish the quality harness and project primitives required for all later phases.

### Scope

- Harden Vitest configuration for both unit and integration testing.
- Add coverage reporting and enforce thresholds.
- Add test utilities for auth/session mocking, DB setup, factories, storage mocks, AI mocks, and time control.
- Define conventions for server action testing and route handler testing.
- Introduce domain folder structure for auction-related code.

### Deliverables

- Vitest coverage provider configured.
- Test database bootstrap utilities and migration runner.
- Shared test factories and fixtures.
- Mock adapters for storage and AI services.
- Clear README or inline docs for running targeted tests.

### Acceptance Criteria

- `npm run test:run` succeeds locally.
- Coverage reporting is enabled and visible.
- At least one representative unit test and one representative DB-backed integration test exist for the new harness.
- The foundation is suitable for later phase expansion without rewriting the test setup.

### Phase 0 Tracker

- [x] Detailed phase spec approved
- [x] Coverage provider configured
- [x] Test DB harness implemented
- [x] Factories and mocks implemented
- [x] Example unit and integration tests added
- [x] Coverage gates enforced
- [x] Phase accepted

## Phase 1 - Listing Creation and Management

Objective: deliver the first complete seller listing flow, including schema, seeded listing data, public and seller listing pages, signed Cloudinary image upload, seller-only draft management, and listing detail views that are ready for later bidding work.

Status: Accepted on 2026-03-25

Detailed execution plan: [tasks/TODO.md](./TODO.md)

### Sub-Phases

- `1A` Schema, seed data, `/listings`, and `/dashboard/listings`
- `1B` `/sell` create listing page with signed Cloudinary upload
- `1C` `/listings/[id]` display and draft visibility rules
- `1D` Seller controls and draft edit modal on `/listings/[id]`
- `1E` Additional seller image upload and thumbnail management

### Phase 1 Decisions

- Draft listing detail pages are owner-only and return not found for non-owners.
- Phase 1 does not add the `bid` table; public listing cards and detail metadata show `startingBid` and `0 bids`.
- Listing images use signed Cloudinary browser uploads plus persisted DB metadata and seller-owned deletion.
- The first uploaded image creates a draft using AI-derived listing suggestions when available, with a manual fallback that preserves seller control.
- `/sell` uses a strict two-panel no-overflow desktop/tablet layout and stacks on narrow screens.
- Listings are capped at `5` total images, and the last remaining image cannot be deleted.

### Acceptance Criteria

- Public `/listings` shows non-draft listings from the database with status-aware cards.
- Protected `/dashboard/listings` shows the current user's listings with tabs for `Drafts`, `Active`, `Scheduled`, and `Ended`.
- `/sell` supports local preview, signed Cloudinary upload with progress, draft creation, and redirect to `/listings/[id]`.
- `/listings/[id]` shows the requested read layout for public listings and owner-only draft listings.
- Sellers can save draft edits, publish drafts, return eligible listings to draft, delete draft listings, and manage up to `5` images.
- Listing and listing-image data persist correctly in SQLite via Drizzle, and Cloudinary assets are removed on destructive seller actions.
- Unit and integration coverage are added for the new schema, seller rules, page access rules, and image-management flows.

### Phase 1 Tracker

- [x] Detailed phase spec approved
- [x] `tasks/TODO.md` execution plan finalized
- [x] Listing schema and migration finalized
- [x] Signed Cloudinary upload flow finalized
- [x] `/listings` and `/dashboard/listings` implemented
- [x] `/sell` listing creation flow implemented
- [x] `/listings/[id]` display and seller controls implemented
- [x] Image management flows implemented
- [x] Unit tests completed
- [x] Integration tests completed
- [x] 80%+ coverage met
- [x] 100% critical-path integration coverage met
- [x] Phase accepted

## Phase 2 - AI Features

Objective: add AI-assisted seller tooling while keeping the seller fully in control of the final listing.

Status: Approved on 2026-03-27. Implementation completed; acceptance still pending the 80% coverage gate.

### Scope

- Smart Listing Creator from a single uploaded photo.
- Description Enhancer for draft descriptions.
- AI output populates form suggestions but never auto-publishes a listing.

### Smart Listing Creator

- Input: single seller-uploaded photo.
- Output schema:
  - title
  - description
  - category enum value
  - condition enum value
  - suggestedStartingPriceCents
- Low-confidence category guesses should resolve to `other`.
- User can accept all, accept selectively, or ignore suggestions.

### Description Enhancer

- Input: existing listing title, category, condition, and seller-written description.
- Output: one improved description draft.
- The user can preview, replace, or continue editing manually.

### Safety and Reliability Rules

- All AI responses must conform to a strict Zod schema.
- If parsing fails, the UI shows a recoverable error and preserves user-entered content.
- No AI result should silently overwrite form fields without user action.
- Prompts must avoid making factual claims that cannot be inferred from the photo or user input.

### Backend Work

- Add provider-agnostic AI service module through the Vercel AI SDK.
- Add prompt builders and structured-output parsing helpers.
- Add rate limiting or lightweight usage guardrails if needed for abuse protection.

### Acceptance Criteria

- User can generate structured listing suggestions from a single photo upload.
- User can enhance a description draft without losing manual edits.
- AI failures degrade gracefully without blocking manual listing creation.

### Test Requirements

- Unit tests for prompt input shaping, schema parsing, price normalization, and fallback behavior.
- Integration tests for AI-assisted form flows using mocked AI responses.
- AI parsing success and failure paths must be covered.

### Phase 2 Tracker

- [x] Detailed phase spec approved
- [x] AI service contract finalized
- [x] Smart Listing Creator implemented
- [x] Description Enhancer implemented
- [x] AI fallback/error handling implemented
- [x] Unit tests completed
- [x] Integration tests completed
- [x] Implementation verification run (`npm run test:run`, `npm run lint`, `npm run build`, `npx tsc --noEmit`)
- [ ] 80%+ coverage met
- [ ] Phase accepted

## Phase 3 - Browse and Search Listings

Objective: improve public browse discovery and seller listing navigation with richer seed data, explicit navbar search, filter/sort controls, and shared pagination.

Detailed execution plan: [tasks/TODO.md](./TODO.md)

### Sub-Phases

- `3A` Seed data and status tabs
- `3B` Filter dropdowns and sort
- `3C` Search
- `3D` Pagination

### Phase 3 Decisions

- `/listings` uses URL-driven server-rendered browse state.
- Public status tabs are `active`, `scheduled`, and `ended`, with `active` as the default.
- Navbar search is always visible and submits only on Enter or search-button click.
- Search uses simple case-insensitive contains matching on listing title and description.
- Phase 3 price filtering and sorting use `startingBidCents`.
- `Most Bids` remains visible in the UI/query contract, but temporarily resolves to the same ordering as `Newest` until Phase 4 adds real bid data.
- `/dashboard/listings` keeps its existing seller status tabs and adopts shared pagination only.
- Pagination is shared, offset-based, and URL-driven through `page` and `pageSize`.

### Acceptance Criteria

- Visitors can browse `active`, `scheduled`, and `ended` listings without authentication.
- Search returns title/description matches using the locked simple contains behavior.
- Public status tabs, filters, sort, and page size are reflected in the `/listings` UI and URL query state.
- Navbar search is always visible, works from any page, and applies search on `/listings`.
- Shared pagination works on both `/listings` and `/dashboard/listings` while preserving active query state.
- Seed data supports realistic UI testing across statuses, categories, conditions, and pagination states.

### Test Requirements

- Unit tests for query parsing, search normalization, filter/sort mapping, and pagination utilities.
- Integration tests for public browse query behavior, seller listings pagination, header search behavior, and `/listings` UI state driven by query params.

### Phase 3 Tracker

- [x] Detailed phase spec approved
- [x] `tasks/TODO.md` execution plan finalized
- [x] Seed data plan finalized
- [x] Browse query contract finalized
- [x] Search/filter/sort contract finalized
- [x] Shared pagination contract finalized
- [x] Unit tests completed
- [x] Integration tests completed
- [ ] 80%+ coverage met
- [ ] Phase accepted

## Phase 4 - Bidding and Real-Time Updates

Objective: allow authenticated users to place bids and observe auction state updates live.

### Scope

- Add bid entry on listing detail pages.
- Persist bids transactionally.
- Update cached current bid and bid count.
- Show bid history summary.
- Add live updates for new highest bids and auction state changes.

### Bidding Rules

- Only authenticated non-seller users can bid.
- Listing must be active and not yet ended.
- Bid amount must be at least current required minimum.
- Minimum increments are tiered based on the current highest bid.
- Rejected bids return clear user-facing messaging.

### Real-Time Design

- Primary: Ably channel scoped to a listing.
- Events:
  - bid accepted
  - listing outbid state changed
  - auction ended
- Fallback: short polling if Ably is unavailable.

### Acceptance Criteria

- Authenticated buyer can place a valid bid and see the state update.
- Invalid bids are rejected without corrupting listing state.
- Concurrent bid attempts resolve correctly with a single accepted ordering.
- Users viewing an active listing receive timely updates when new bids are placed.

### Test Requirements

- Unit tests for bid validation, minimum increment logic, and bid state projection.
- Integration tests for valid bid, invalid bid, seller self-bid rejection, ended-auction rejection, and concurrent bid ordering.
- 100% integration coverage for bid placement success and failure workflows.

### Phase 4 Tracker

- [ ] Detailed phase spec approved
- [ ] Bid rule contract finalized
- [ ] Bid persistence transaction implemented
- [ ] Listing bid UI implemented
- [ ] Live update transport implemented
- [ ] Unit tests completed
- [ ] Integration tests completed
- [ ] 80%+ coverage met
- [ ] 100% critical-path integration coverage met
- [ ] Phase accepted

## Phase 5 - Auction Finalization and Notifications

Objective: automatically end auctions, determine outcomes correctly, and notify affected users.

### Scope

- Activate scheduled listings whose `startsAt` has passed.
- Detect listings whose end time has passed.
- Finalize auctions idempotently.
- Mark sold, unsold, or reserve-not-met outcomes.
- Persist winner information when applicable.
- Notify seller and highest bidder of the result.

### Finalization Rules

- No bids: set `status = ended`, `outcome = unsold`
- Highest bid below reserve: set `status = ended`, `outcome = reserve_not_met`
- Highest valid bid meeting reserve or no reserve: set `status = ended`, `outcome = sold`
- Finalization must not produce duplicate notifications or conflicting winners if run multiple times.

### Notification Strategy

- Required: in-app notifications stored in the DB.
- Optional later enhancement: email notifications after mail infrastructure exists.
- Notification payloads should be typed by event kind for clean dashboard rendering.

### Job Design

- Protected API route or server function for auction lifecycle processing.
- Scheduled in production by cron-job.org calling the protected endpoint.
- Manual local trigger supported for development and testing.

### Acceptance Criteria

- Scheduled listings transition to `active` automatically when `startsAt <= now`.
- Expired active auctions transition to a final state automatically.
- Finalized listings end with `status = ended` and the correct outcome.
- Winner and seller notifications are created exactly once.
- Re-running the finalization job is safe.

### Test Requirements

- Unit tests for activation/finalization decision logic and notification payload building.
- Integration tests for scheduled-to-active transitions.
- Integration tests for sold, no-bid, and reserve-not-met outcomes.
- Integration tests for idempotent re-run behavior.
- 100% integration coverage for auction closure workflows.

### Phase 5 Tracker

- [ ] Detailed phase spec approved
- [ ] Lifecycle job contract finalized
- [ ] Notification model finalized
- [ ] Auction lifecycle processing implemented
- [ ] Winner/seller notifications implemented
- [ ] Unit tests completed
- [ ] Integration tests completed
- [ ] 80%+ coverage met
- [ ] 100% critical-path integration coverage met
- [ ] Phase accepted

## Phase 6 - User Dashboard

Objective: give users one place to manage their auction activity.

### Scope

- Replace the placeholder dashboard with real auction data.
- Sections for:
  - my listings
  - my bids
  - watching
  - notifications
- Allow basic seller management actions where still valid.
- Allow users to watch and unwatch listings.

### Dashboard Behavior

- My listings: status, current price, bid count, end time, quick edit/view links.
- My listings: if a listing is scheduled or active with zero bids, show whether it can be returned to draft.
- My bids: listing, current high bid, user bid amount, outbid/winning/ended status.
- Watching: watched listings with quick navigation.
- Notifications: unread/read state and drill-in link targets.

### Acceptance Criteria

- Authenticated user sees only their own auction activity.
- Dashboard summaries reflect current auction and notification state.
- Watch/unwatch behavior persists and updates dashboard state.

### Test Requirements

- Unit tests for dashboard view model mapping and notification state helpers.
- Integration tests for dashboard sections, user scoping, watch/unwatch actions, and status rendering across auction states.

### Phase 6 Tracker

- [ ] Detailed phase spec approved
- [ ] Dashboard information architecture finalized
- [ ] Watch model/actions finalized
- [ ] My listings section implemented
- [ ] My bids section implemented
- [ ] Watching section implemented
- [ ] Notifications section implemented
- [ ] Unit tests completed
- [ ] Integration tests completed
- [ ] 80%+ coverage met
- [ ] Phase accepted

## Phase 7 - Polish, CI, Prod DB Switch and Publishing

Objective: harden the project for repeatable deployment and public demonstration.

### Scope

- UX polish and accessibility pass.
- Loading, empty, and error states across the app.
- Final metadata and SEO basics.
- CI pipeline for lint, test, coverage, and build.
- Production database switch.
- Production storage configuration.
- Deployment documentation and publish checklist.

### Production Readiness Items

- Environment variable documentation completed.
- Seed/demo data strategy documented.
- CI blocks merges when lint, tests, coverage, or build fail.
- Database migrations run cleanly in production target.
- Cloudinary, Ably, and cron-job.org production configuration documented.
- Scheduled auction finalization job configured.
- AI provider credentials and rate limits documented.

### Acceptance Criteria

- Project can be built, tested, and deployed from a clean checkout.
- Production deployment uses the chosen hosted database plus Cloudinary for assets and Ably for real-time updates.
- Core user flows work in the published environment.
- CI and docs are sufficient for repeatable maintenance.

### Test Requirements

- Add or update integration tests for any prod-path changes.
- Validate build and deployment assumptions through CI.
- Run final regression pass across all critical workflows.

### Phase 7 Tracker

- [ ] Detailed phase spec approved
- [ ] Accessibility and UX polish completed
- [ ] CI workflow implemented
- [ ] Production DB target finalized
- [ ] Production DB switch implemented
- [ ] Production storage configured
- [ ] Deployment docs completed
- [ ] Final regression completed
- [ ] Phase accepted

## Dependency Order

- Phase 0 blocks all later phases.
- Phase 1 blocks Phases 2 through 6.
- Phase 3 should land before or alongside Phase 4 because bidding requires a public listing detail page.
- Phase 4 blocks Phase 5.
- Phase 5 and Phase 6 can overlap once bidding is stable.
- Phase 7 happens after all feature phases are accepted.

## How To Use This Document During Delivery

- Before starting a phase, expand that phase section with any newly-decided schema details, routes, edge cases, and test scenarios.
- During implementation, update the phase tracker checkboxes as milestones are completed.
- After tests pass and coverage is confirmed, mark the phase accepted.
- If scope changes, update this file first so implementation stays aligned with an explicit spec.
