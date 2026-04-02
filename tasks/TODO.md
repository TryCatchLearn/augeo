# Phase 5 Execution TODO

Created: 2026-04-02
Status: Planning complete, implementation pending

## Objective

Deliver Phase 5 auction lifecycle automation, countdown-driven ended-state UI, persistent notifications, live toast delivery, and the navbar notification inbox as a sequence of implementable sub-phases that can be executed in separate sessions without reopening `tasks/SPEC.md`.

## Execution Order

- `5A` blocks `5B` and `5C`.
- `5C` blocks `5D`.
- `5B` can land before or after `5C`, but the intended rollout order remains `5A` -> `5B` -> `5C` -> `5D`.

## Locked Decisions

- `tasks/TODO.md` is the active standalone execution document for Phase 5.
- `tasks/SPEC.md` remains the concise phase summary and tracker.
- Email notifications remain out of scope.
- Production background processing uses cron-job.org calling one protected endpoint every minute.
- Add `AUCTION_LIFECYCLE_CRON_SECRET` for cron authentication.
- The protected lifecycle route is `POST /api/auctions/lifecycle`.
- The route authenticates only through `Authorization: Bearer <secret>`.
- Browser clients must never receive the cron secret.
- Add one shared lifecycle service that is used by both the cron route and the dev-only manual trigger.
- The manual trigger is a dev-only navbar icon button rendered only when `NODE_ENV !== "production"`.
- The manual trigger must be guarded on the server side as well, not only hidden in the UI.
- The manual trigger calls the same lifecycle service through a dev-only server action and shows a sonner summary toast.
- Phase 5 extends the `listing` persistence model with:
  - `outcome` enum `sold | unsold | reserve_not_met`
  - `winnerUserId` nullable
  - `winningBidId` nullable
- Phase 5 adds a `notification` table with:
  - `id`
  - `userId`
  - `type`
  - `dedupeKey`
  - `payload`
  - `readAt` nullable
  - `createdAt`
- `notification.dedupeKey` must be unique.
- Add indexes that support unread-count reads and recent-notification reads by `userId`.
- Realtime keeps the shared Ably connection from Phase 4.
- Add `listing.lifecycle.changed` on `listing:{id}`.
- Add `notification.created` on `user:{id}`.
- Query/view models must be extended for:
  - listing card lifecycle state and seller-safe/public-safe outcome rendering
  - listing detail lifecycle state and seller-safe/public-safe outcome rendering
  - notification unread count
  - 10 recent notifications
- Public UI must not expose `reserve_not_met`.
- Seller-facing UI and seller notifications must preserve the real `reserve_not_met` outcome.
- Countdown zero is a client-visible boundary:
  - when `endsAt <= now`, listing cards and detail views switch immediately into local ended/finalizing UI
  - local UI must block new bids immediately
  - local ended/finalizing state persists until fresh server data or a lifecycle event confirms the terminal state
- Clicking a toast CTA does not mark a notification as read in Phase 5.
- Only explicit inbox actions mark notifications read in Phase 5.

## Shared Interfaces And Contracts

### Lifecycle route and service contract

- Create a shared lifecycle service in a server-only boundary instead of embedding lifecycle logic in the route or navbar action.
- The lifecycle service accepts `now` for testability and returns a summary object with:
  - `activatedCount`
  - `closedCount`
  - `soldCount`
  - `unsoldCount`
  - `reserveNotMetCount`
- The route returns that summary as JSON.
- The route must use `Cache-Control: no-store`.
- Unauthorized or malformed lifecycle requests return a non-2xx response and do not run any lifecycle work.
- The dev-only server action returns the same summary shape so the navbar trigger can render a consistent toast.

### Lifecycle state transition contract

- Lifecycle processing runs in two passes, in this order:
  - activate scheduled listings whose `startsAt <= now`
  - close active listings whose `endsAt <= now`
- Activation rules:
  - only `scheduled` listings are eligible
  - activation changes `status` to `active`
  - activation never changes `endsAt`, reserve, bids, or winner fields
- Closure rules:
  - only `active` listings are eligible
  - closure changes `status` to `ended`
  - no bids -> `outcome = unsold`
  - highest bid below reserve -> `outcome = reserve_not_met`
  - reserve met or no reserve -> `outcome = sold`
  - `winnerUserId` and `winningBidId` are set only for sold listings
  - `winnerUserId` and `winningBidId` remain `null` for unsold and reserve-not-met listings
- Lifecycle processing must be idempotent:
  - already-activated listings are skipped
  - already-ended listings are skipped
  - reruns must not change an already-finalized outcome
  - reruns must not create duplicate notifications

### Realtime event contract

- Listing lifecycle channel name remains `listing:{id}`.
- User notification channel name remains `user:{id}`.
- Add listing event name `listing.lifecycle.changed`.
- Add user event name `notification.created`.
- `listing.lifecycle.changed` payload must include:
  - `listingId`
  - `status`
  - `outcome`
  - `endedAt`
  - `winnerUserId`
  - `winningBidId`
  - `currentBidCents`
  - `bidCount`
- Publish `listing.lifecycle.changed` only after the activation or closure transaction commits.
- `notification.created` payload must include enough data to render a toast and update the inbox without a forced full refresh:
  - `notificationId`
  - `type`
  - `listingId`
  - `listingUrl`
  - `title`
  - `message`
  - `createdAt`
  - `readAt`
  - optional type-specific icon/outcome metadata needed by the client mapper
- Publish `notification.created` only after the notification row commits.

### Notification persistence and read contract

- Add a dedicated notifications feature module for typed payload builders, persistence helpers, queries, display mappers, and read actions.
- Lock notification types to:
  - `outbid`
  - `auction_won`
  - `item_sold`
  - `item_not_sold`
- Notification payloads must be type-safe and sufficient to:
  - render a toast
  - render the bell inbox row
  - navigate back to the listing
- Each persisted notification must have a deterministic `dedupeKey`.
- `dedupeKey` generation rules:
  - outbid: tied to the accepted bid that displaced the previous leader plus the recipient
  - auction lifecycle notifications: tied to the finalized listing outcome plus the recipient
- Add actions for:
  - `markNotificationRead(notificationId)`
  - `markAllNotificationsRead()`
- `markAllNotificationsRead()` affects all unread notifications for the session user, not only the visible 10 rows.

### Query and view-model contract

- Extend listing card data with:
  - `status`
  - `outcome`
  - seller-safe/public-safe ended-state copy inputs
- Extend listing detail data with:
  - `status`
  - `outcome`
  - `winnerUserId`
  - `winningBidId`
  - seller-safe/public-safe ended-state copy inputs
- Add notification query outputs for authenticated navbar rendering:
  - unread count
  - 10 recent notifications sorted newest-first
- The unread badge shows the total unread count capped as `9+`.
- Each notification row in the inbox must expose:
  - `id`
  - `type`
  - `title`
  - `message`
  - `listingId`
  - `listingUrl`
  - `createdAt`
  - `readAt`
  - `isRead`

## 5A - Auction Lifecycle Engine And Protected Endpoint

Status: Not started

### Deliverables

- Shared server-side lifecycle service finalized.
- Protected cron route finalized.
- Dev-only navbar trigger contract finalized.
- Listing lifecycle persistence fields finalized.
- `listing.lifecycle.changed` publish contract finalized.

### Implementation tasks

- Update implementation docs to add the new `listing` lifecycle fields:
  - `outcome`
  - `winnerUserId`
  - `winningBidId`
- Document the Drizzle schema, checked-in SQL migration, seed/test fixture updates, and affected query/view-model updates as one inseparable change set whenever Phase 5 implementation begins.
- Document the shared lifecycle service boundary and require both the cron route and dev trigger to call it instead of duplicating logic.
- Document route auth requirements:
  - `POST` only
  - bearer secret only
  - no browser/session auth path
  - no public access
- Document dev-trigger requirements:
  - navbar icon only in development
  - server action rejects non-development execution
  - returns the same summary shape as the route
  - shows a sonner success/error summary for quick manual verification
- Document lifecycle pass ordering:
  - activation pass first
  - closure pass second
- Document the activation filter:
  - `status = scheduled`
  - `startsAt IS NOT NULL`
  - `startsAt <= now`
- Document the closure filter:
  - `status = active`
  - `endsAt <= now`
- Document finalization outcome rules and winner-field behavior exactly.
- Document idempotency requirements for reruns and partial retries.
- Document `listing.lifecycle.changed` publishing rules:
  - publish after commit only
  - publish once per changed listing
  - include enough terminal-state data for open cards and detail pages to reconcile without guessing

### Test tasks

- Unit tests for:
  - scheduled activation eligibility
  - closure eligibility
  - outcome selection for sold, unsold, and reserve-not-met
  - winner-field assignment rules
  - idempotent rerun outcome calculation
- Integration tests for:
  - route rejects missing bearer secret
  - route rejects incorrect bearer secret
  - scheduled listing activation
  - sold closure
  - unsold closure
  - reserve-not-met closure
  - rerun safety with no duplicate state changes
  - dev trigger hidden/blocked outside development

### Exit criteria

- The docs leave no ambiguity about lifecycle entrypoints, auth, pass ordering, or idempotent closure rules.
- The docs fully specify the summary payload and the realtime lifecycle event contract.

## 5B - Countdown Timer UI And Ended-State Rendering

Status: Not started

### Deliverables

- Shared countdown component contract finalized.
- Listing card ended-state rendering finalized.
- Listing detail ended-state rendering finalized.
- Local zero-time bid lockout finalized.

### Implementation tasks

- Add one shared client countdown component used by:
  - listing cards
  - listing detail
- Replace the current static remaining-time text with the shared countdown UI.
- Lock urgency tiers to:
  - neutral when `> 24h`
  - warning when `<= 24h`
  - urgent when `<= 1h`
  - critical when `<= 5m`
  - ended when `<= 0`
- Document that the countdown uses token-based styling rather than ad hoc colors.
- Document card behavior at zero:
  - immediately stop showing an active countdown
  - switch to local ended/finalizing copy
  - no longer present the listing as bid-eligible
  - issue one refresh attempt so server truth can catch up
- Document detail-page behavior at zero:
  - immediately remove or disable the bid form locally
  - replace the time display with ended/finalizing state
  - preserve the local terminal UI until fresh server data or `listing.lifecycle.changed` arrives
- Document reconciliation behavior:
  - if refreshed data or realtime confirms `ended`, render the final ended state
  - if seller sees `reserve_not_met`, show seller-specific outcome copy
  - if non-seller sees `reserve_not_met`, render generic ended/unsold copy
- Document that countdown zero does not directly mutate the database and does not bypass lifecycle processing.

### Test tasks

- Unit tests for:
  - countdown formatting across days, hours, minutes, and ended
  - urgency-tier selection thresholds
- Client tests for:
  - card zero transition
  - detail zero transition
  - local bid lockout at zero
  - one-time refresh attempt when local zero is reached
- Integration tests for:
  - card ended-state rendering after lifecycle confirmation
  - detail ended-state rendering after lifecycle confirmation
  - seller-only reserve-not-met messaging
  - public reserve-not-met suppression
  - `listing.lifecycle.changed` reconciliation for open views

### Exit criteria

- The docs fully specify countdown urgency styling, zero-time behavior, and seller/public ended-state differences.
- The docs make it clear that local zero-state UI is immediate but server truth still comes from lifecycle processing.

## 5C - Persistent Notification Creation And Live Toast Delivery

Status: Not started

### Deliverables

- Notifications feature module contract finalized.
- Notification schema and dedupe contract finalized.
- DB-backed outbid notifications finalized.
- Lifecycle winner/seller notifications finalized.
- `notification.created` toast delivery finalized.

### Implementation tasks

- Update the implementation docs to add the `notification` table and supporting indexes.
- Document the notifications feature module responsibilities:
  - typed payload builders
  - display mappers
  - persistence helpers
  - queries
  - read actions
- Lock notification types to:
  - `outbid`
  - `auction_won`
  - `item_sold`
  - `item_not_sold`
- Document creation rules:
  - `outbid` created when an accepted bid displaces a different previous highest bidder
  - `auction_won` created for the winning bidder when a listing closes as sold
  - `item_sold` created for the seller when a listing closes as sold
  - `item_not_sold` created for the seller when a listing closes as unsold or reserve-not-met
- Document dedupe behavior:
  - persisted rows must be exactly-once per recipient and business event
  - lifecycle reruns must not create duplicates
  - reconnect/replay toast duplicates must be deduped by persisted notification id
- Document the Phase 4 transition:
  - outbid toasts stop being realtime-only
  - outbid notifications are created in the database during bid acceptance
  - toasts now derive from `notification.created`
- Document `notification.created` payload requirements so the client can:
  - show the toast
  - increment the unread badge
  - prepend the recent inbox row
- Document toast behavior:
  - shown on any authenticated page
  - includes type-appropriate icon, title, message, and listing CTA
  - clicking the CTA navigates only
  - toast receipt does not change read state

### Test tasks

- Unit tests for:
  - notification payload builders
  - display-copy mapping
  - dedupe-key generation
  - per-type icon/title/message mapping
- Integration tests for:
  - outbid notification creation
  - auction-won notification creation
  - item-sold notification creation
  - item-not-sold notification creation for both unsold and reserve-not-met outcomes
  - lifecycle rerun safety with no duplicate notifications
  - live toast delivery from `notification.created`

### Exit criteria

- The docs fully specify notification creation timing, exact-once behavior, and the move from realtime-only outbid to DB-backed notification delivery.
- The docs fully specify the generic `notification.created` event contract used by both toast delivery and the future inbox.

## 5D - Navbar Notification Bell, Recent Inbox, And Read Actions

Status: Not started

### Deliverables

- Navbar bell contract finalized.
- Recent notification inbox contract finalized.
- Read-action contract finalized.
- Live bell/inbox reconciliation contract finalized.

### Implementation tasks

- Add server queries for:
  - unread count
  - 10 recent notifications newest-first
- Add a shadcn-style popover primitive for the notification inbox.
- Render the bell icon only for authenticated users.
- Document bell badge behavior:
  - hidden when unread count is `0`
  - raw count for `1` through `9`
  - `9+` when count is greater than `9`
- Document popover content:
  - `Mark all read` action
  - 10 recent notifications
  - per-type icon
  - title
  - message
  - relative time
  - clear read/unread styling
- Document row interaction:
  - click row
  - call `markNotificationRead`
  - close the popover
  - navigate to the listing
- Document `Mark all read` interaction:
  - affects all unread notifications for the current user
  - updates badge and visible rows immediately after success
- Document live-update behavior:
  - `notification.created` increments the unread badge
  - `notification.created` prepends the new recent item
  - if the list already has 10 rows, drop the oldest visible row
- Document empty-state behavior for users with no notifications.

### Test tasks

- Query/action tests for:
  - unread count
  - 10 recent notifications ordering
  - `markNotificationRead`
  - `markAllNotificationsRead`
- Client tests for:
  - live badge increment from `notification.created`
  - live recent-row prepend behavior
  - 10-row list trimming after a new event
- Integration tests for:
  - bell rendering for authenticated users only
  - popover content
  - read/unread styling
  - click-to-mark-read and navigate
  - `Mark all read` behavior
  - unread badge capping as `9+`

### Exit criteria

- The docs fully specify bell rendering, inbox composition, read actions, and live badge/list reconciliation.
- The docs leave no ambiguity about read-state ownership or the difference between toast navigation and explicit read actions.

## Final Verification Checklist

- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Completion Notes

- Keep `tasks/TODO.md` self-sufficient; implementation sessions should not need to reopen `tasks/SPEC.md`.
- If Phase 5 scope changes, update this file before coding so later sessions inherit the current source of truth.
- When implementation starts, update Drizzle schema, checked-in SQL migration, seed/test fixtures, and affected query/view-model tests together.
