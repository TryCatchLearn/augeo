# Phase 4 Execution TODO

Created: 2026-03-31
Status: Planning complete, implementation pending

## Objective

Deliver Phase 4 bidding and realtime updates as a sequence of implementable sub-phases that can be executed in separate sessions without reopening `tasks/SPEC.md`.

## Execution Order

- `4A` blocks `4B`, `4C`, and `4D`.
- `4B` blocks `4C` and `4D`.
- `4C` and `4D` can land independently after `4B`.

## Locked Decisions

- `tasks/TODO.md` is the active standalone execution document for Phase 4.
- `tasks/SPEC.md` remains the concise phase summary and tracker.
- Phase 4 introduces bidding and realtime auction-state updates, but it does not add auction finalization or persistent notification inbox data.
- Realtime uses Ably over websockets with token auth.
- The existing server-side Ably secret is `ABLY_API_KEY`; it must remain server-only.
- Browser clients authenticate through a server-issued Ably token endpoint/route and must never receive the raw API key.
- There must never be more than one Ably connection per browser tab.
- Authenticated users hold a single global Ably connection while authenticated.
- Guests connect only when routed to `/listings` or `/listings/[id]`.
- Guests disconnect when they leave those routes.
- `/listings/[id]/edit` does not count as a public listings route for guest realtime access.
- Guests may subscribe only to `listing:*`.
- Authenticated users may subscribe to `listing:*` and `user:{id}`.
- Browser clients never publish directly to Ably.
- Phase 4 does not include polling fallback; if realtime is unavailable, the temporary fallback is normal refresh/navigation behavior.
- Outbid notifications in Phase 4 are realtime toast notifications only.
- DB-backed notifications remain Phase 5 work.
- `startingBidCents` remains the opening price only.
- Everywhere that shows the live/current price must use `currentBidCents ?? startingBidCents`.
- Listing cards must move from Phase 3 placeholder pricing to real cached bid state in Phase 4.
- Bid history is newest-first and uses the stored bidder `user.name`.
- Seller controls remain available only while `bidCount === 0`.
- Once the first bid exists, seller controls are replaced by a read-only auction activity panel plus bid history.
- The current highest bidder may place a higher bid as long as the new bid satisfies the next minimum increment.
- Bid increments are locked to the following ladder:
  - current bid `< $100`: `+$1`
  - `$100 - $499.99`: `+$5`
  - `$500 - $999.99`: `+$10`
  - `$1,000 - $4,999.99`: `+$25`
  - `$5,000+`: `+$50`

## Shared Interfaces And Contracts

### Schema and persistence contract

- Add a new `bid` table.
- `bid` columns are locked to:
  - `id`
  - `listingId`
  - `bidderId`
  - `amountCents`
  - `createdAt`
- Add cached bidding fields to `listing`:
  - `currentBidCents` nullable
  - `bidCount` default `0`
- `currentBidCents` is nullable so listings with no bids can keep using `startingBidCents` as the displayed fallback.
- Add indexes that support:
  - bid history reads by listing ordered newest-first
  - highest-bid lookup by listing
  - bidder lookups for future dashboard work where practical
- Bid placement must be transactional:
  - re-read the listing and current highest bid inside the transaction
  - validate against that fresh state
  - insert the accepted bid
  - update `listing.currentBidCents` and `listing.bidCount`
  - commit before any Ably publish occurs

### Query and view-model contract

- Extend listing card data so cards expose:
  - `currentPriceCents`
  - `bidCount`
  - existing display fields already used by the grid
- Extend listing detail data so the detail page can server-render before realtime attaches.
- Listing detail data must include:
  - listing identity and seller metadata already present
  - `startingBidCents`
  - `currentBidCents`
  - `currentPriceCents`
  - `minimumNextBidCents`
  - `bidCount`
  - `highestBidderId`
  - `viewerBidStatus` as `highest | outbid | none`
  - `canPlaceBid`
  - full bid history rows with bidder name, amount, and timestamp
- Bid history is displayed newest bid first.
- Seller-control logic must consume the real `bidCount` from the query layer rather than the current placeholder `0`.

### Action and validation contract

- Add a dedicated bid placement server action.
- Add a dedicated bid input schema for the action payload.
- The bid action is authoritative for all business-rule enforcement.
- Bid validation rules are locked to:
  - viewer must be authenticated
  - seller cannot bid on their own listing
  - listing must exist
  - listing must be `active`
  - listing must not be expired
  - first bid must be at least `startingBidCents`
  - later bids must be at least `currentBidCents + requiredIncrement`
  - highest bidder can raise their own bid if they satisfy the same next-minimum rule
- The bid form must surface clear user-facing action errors for rejected bids.

### Realtime event contract

- Listing channel name: `listing:{id}`
- User channel name: `user:{id}`
- Listing event name: `bid.placed`
- User event name: `auction.outbid`
- `bid.placed` payload must include:
  - `listingId`
  - `currentBidCents`
  - `bidCount`
  - `minimumNextBidCents`
  - `highestBidderId`
  - `bid`
    - `id`
    - `bidderId`
    - `bidderName`
    - `amountCents`
    - `createdAt`
- `auction.outbid` payload must include:
  - `listingId`
  - `listingTitle`
  - `currentBidCents`
  - `minimumNextBidCents`
  - `bidCount`
  - `listingUrl`
  - enough event identity to dedupe reconnect/replay toasts, using the accepted bid id
- `auction.outbid` is published only when an accepted bid displaces a different previous highest bidder.
- `auction.outbid` is not published for:
  - the first bid on a listing
  - a bidder increasing their own already-highest bid
  - unauthenticated viewers

### Realtime client contract

- Add a root client-side realtime provider mounted from the app layout.
- The provider owns the single Ably client for the tab.
- The provider is responsible for:
  - deciding when a connection should exist
  - exposing listing-channel subscription utilities
  - exposing authenticated user-channel subscription utilities
  - ensuring connection reuse across cards, detail pages, and global toast handling
- Listing cards and listing detail UI must consume shared provider state/utilities and must not create ad hoc Ably clients.

## 4A - Bid Model, Bid Form UI, And Bid History

Status: Not started

### Deliverables

- Bid schema and migration finalized.
- Cached listing bid fields finalized.
- Bid placement action and validation contract finalized.
- Listing detail page replaces the buyer placeholder with a real bid form.
- Listing detail page includes a bid history panel beneath the bid panel.
- Seller controls are hidden after the first accepted bid.

### Implementation tasks

- Update the implementation docs to add the `bid` table and the new cached listing columns.
- Require Drizzle schema, SQL migration, and any affected test harness expectations to land together.
- Document the query-layer switch from placeholder bid data to persisted bid state.
- Add and document domain helpers for:
  - bid eligibility against listing status and expiration
  - increment lookup from the locked price ladder
  - minimum-next-bid calculation
  - viewer bid status projection
- Document that current price is derived as:
  - `currentBidCents ?? startingBidCents`
- Document the bid form behavior:
  - buyers only
  - prefilled with the minimum acceptable bid
  - action error shown inline
  - successful submission relies on normal server-action refresh behavior in `4A`
- Document the listing-detail right-column layout:
  - top card is the bid form for eligible buyers or seller activity panel for sellers/no-bid sellers
  - bid history sits directly underneath
  - bid history panel height shows about five rows before scrolling
- Document seller behavior:
  - `bidCount === 0`: existing seller controls remain
  - `bidCount > 0`: seller controls are replaced with read-only auction activity information
- Document that return-to-draft checks must use real persisted `bidCount`.
- Document that bid history uses newest-first ordering and shows:
  - bidder name
  - amount
  - timestamp
- Lock the initial viewer bid status values to:
  - `highest` when the viewer is the current highest bidder
  - `outbid` when the viewer has at least one bid on the listing but is not highest
  - `none` otherwise

### Test tasks

- Unit tests for:
  - bid increment tier mapping
  - minimum-next-bid calculation
  - bid eligibility by listing status and expiration
  - viewer bid status projection
- Integration tests for:
  - valid first bid
  - valid later bid
  - highest-bidder self-raise success
  - unauthenticated rejection
  - seller self-bid rejection
  - inactive listing rejection
  - expired listing rejection
  - insufficient increment rejection
  - listing detail history ordering newest-first
  - seller controls disappearing after the first bid

### Exit criteria

- The docs leave no ambiguity about schema changes, transactional bid placement, or server-side validation.
- The docs fully specify how the bid form and bid history replace the Phase 1 placeholder UI.
- The docs fully specify when sellers lose their mutable controls.

## 4B - Ably Setup And Listing Channel

Status: Not started

### Deliverables

- Server-only Ably helpers finalized.
- Browser token-auth flow finalized.
- Shared realtime provider finalized.
- Listing detail page subscribes to `listing:{id}` and reacts to `bid.placed`.

### Implementation tasks

- Document the Ably integration boundaries:
  - server-only Ably publish/auth code
  - browser-side token-auth client code
  - shared provider mounted from app layout
- Lock env usage to `ABLY_API_KEY` on the server.
- Document the Ably token endpoint/route requirement and explicitly forbid exposing `ABLY_API_KEY` to the client.
- Document token capability rules:
  - guests: subscribe to `listing:*` only
  - authenticated users: subscribe to `listing:*` and `user:{id}`
  - no browser publish capability
- Document the single-connection policy:
  - authenticated user session owns the connection globally
  - guests connect only on `/listings` and `/listings/[id]`
  - guests disconnect off those routes
  - a pre-existing authenticated connection prevents any route-scoped guest connection logic from creating another client
- Document the root provider responsibilities:
  - own and cache the Ably client instance
  - connect/disconnect according to auth and route state
  - expose listing subscription hooks/utilities
  - expose user-channel subscription hooks/utilities for `4D`
- Document the listing detail subscription behavior:
  - subscribe to `listing:{id}`
  - react to `bid.placed`
  - update current price
  - update bid count
  - update minimum next bid
  - update viewer bid status
  - prepend the new bid to history
  - lock seller controls once `bidCount > 0`
- Document that the server publishes `bid.placed` only after a successful committed bid transaction.

### Test tasks

- Unit tests for:
  - Ably token capability generation
  - route-to-connection policy for guests and authenticated users
- Client tests for:
  - one shared Ably client per tab
  - guest connect/disconnect on route changes
  - authenticated connection reuse across pages
- Detail-page subscription tests proving `bid.placed` updates:
  - price
  - bid count
  - minimum bid
  - bid history
  - seller lock state

### Exit criteria

- The docs fully specify the Ably auth model and connection policy.
- The docs fully specify how listing detail state transitions from server render to realtime updates.
- The docs leave no room for duplicate Ably clients within one tab.

## 4C - Live Listing Cards

Status: Completed

### Deliverables

- Thin client wrapper around each listing card finalized.
- Public and dashboard grids reuse the same shared realtime connection strategy.
- Listing cards update current price and bid count from `bid.placed`.

### Implementation tasks

- Document that the server-rendered card shell stays in place.
- Document that only the live price and bid-count fragment becomes client-managed.
- Document that each card wrapper subscribes to `listing:{id}` through the shared realtime provider.
- Document that the wrapper updates only:
  - `currentPriceCents`
  - `bidCount`
- Document that both `/listings` and `/dashboard/listings` use the same wrapper so authenticated sellers reuse the global connection.
- Document that cards do not create direct Ably clients or bypass the provider.

### Test tasks

- Client tests for:
  - price and bid-count updates after `bid.placed`
  - unsubscribe on unmount
  - no duplicate connection creation across multiple cards
- Integration/app tests proving:
  - public cards use the route-scoped guest connection behavior
  - authenticated dashboard cards reuse the existing auth connection

### Exit criteria

- The docs fully specify the card wrapper responsibilities and limits.
- The docs make it clear that cards only consume shared realtime state and never own a connection directly.

## 4D - Outbid Toast Notification

Status: Not started

### Deliverables

- Sonner-based global toast delivery finalized.
- Global authenticated user-channel subscription finalized.
- Outbid toast payload and dedupe behavior finalized.

### Implementation tasks

- Document the dependency addition for `sonner`.
- Document mounting a global toaster in the app shell/layout.
- Document that the shared realtime provider subscribes authenticated users to `user:{id}` globally.
- Document the `auction.outbid` publish rules:
  - publish only when a new accepted bid displaces a different previous highest bidder
  - skip first bid
  - skip self-rebid while still highest
- Document toast behavior:
  - shown on any page while authenticated
  - includes listing title
  - includes the new current price
  - includes a link to the listing
  - dedupes replay/reconnect duplicates using the accepted bid id plus listing identity
- Document that this work remains realtime-only in Phase 4 and does not create DB notification rows or read/unread state.

### Test tasks

- Client tests for:
  - toast rendering on any authenticated page
  - no toast for first-bid cases
  - no toast for self-rebid while already highest
  - dedupe on repeated event delivery
- App/integration tests for:
  - toast CTA target URL
  - guest sessions never subscribing to `user:{id}`

### Exit criteria

- The docs fully specify when outbid toasts are published and when they are suppressed.
- The docs fully specify the global-toast behavior without expanding scope into Phase 5 notifications.

## Final Verification Checklist

- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Completion Notes

- Update `tasks/SPEC.md` tracker checkboxes as Phase 4 planning items, contracts, implementation work, and tests land.
- Keep `tasks/TODO.md` self-sufficient; future implementation sessions should not need to reopen `tasks/SPEC.md` for execution details.
- If Phase 4 scope changes, update this file before coding so later sessions inherit the current source of truth.
