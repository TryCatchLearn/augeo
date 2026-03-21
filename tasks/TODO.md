# Phase 1 Execution TODO

Created: 2026-03-21
Status: Ready for implementation

## Objective

Deliver Phase 1 listing creation and management as a sequence of implementable sub-phases that can be executed in separate sessions without reopening `tasks/SPEC.md`.

## Execution Order

- `1A` blocks all later Phase 1 work.
- `1B` depends on `1A`.
- `1C` depends on `1A`.
- `1D` depends on `1C`.
- `1E` depends on `1B` and `1C`.

## Locked Decisions

- Draft listing detail pages are owner-only and return not found for non-owners.
- Image cap is `5` total images per listing, including the first image uploaded from `/sell`.
- Phase 1 does not add the `bid` table.
- Public listing cards and listing detail metadata show `startingBid` and `0 bids`.
- The first uploaded image creates a publish-ready draft using deterministic fake defaults.
- `/sell` must be a strict two-panel, no-page-overflow layout on desktop and tablet, and may stack on narrow screens.
- Deleting the last remaining image is not allowed.
- `/dashboard/listings` defaults to the `Drafts` tab.
- Date form inputs use browser-local `datetime-local` fields and persist UTC timestamps.

## Shared Interfaces And Rules

### Listing enums

- `status`: `draft | scheduled | active | ended`
- `category`:
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
- `condition`:
  - `new`
  - `like_new`
  - `good`
  - `fair`
  - `poor`

### Listing table

- `id`
- `sellerId`
- `title`
- `description`
- `location`
- `category`
- `condition`
- `startingBidCents`
- `reservePriceCents` nullable
- `startsAt` nullable
- `endsAt` required
- `status`
- `createdAt`
- `updatedAt`

### Listing image table

- `id`
- `listingId`
- `publicId`
- `url`
- `isMain`
- `createdAt`

### Phase 1 route and action surfaces

- `/sell`
- `/listings`
- `/listings/[id]`
- `/dashboard/listings`
- Protected upload-sign endpoint for Cloudinary browser uploads
- Seller-owned mutations for:
  - create draft after first image upload
  - save draft changes
  - publish listing
  - return listing to draft
  - delete draft listing
  - attach additional image
  - set main image
  - delete image

### Storage and environment

- Keep the storage adapter abstraction under `src/server/`.
- Extend the storage plan from upload/delete-only to include signed browser upload support.
- Required env vars:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - listing images folder default, e.g. `CLOUDINARY_LISTING_IMAGES_FOLDER`
- Use the `cloudinary` npm package for server-side signature generation and asset deletion.
- Browser uploads should go directly to Cloudinary with XHR progress tracking.

### Seller rules

- Only authenticated users can access `/sell` and `/dashboard/listings`.
- Draft listings are hidden from the public `/listings` page.
- Draft listing detail pages are visible only to the owner.
- Editing is allowed only while a listing is in `draft`.
- Publish from `draft` sets:
  - `active` when `startsAt` is empty
  - `scheduled` when `startsAt` is in the future
- Return to draft is available in Phase 1 for `scheduled` and `active` listings because no bid table exists yet.
- Ended listings expose no seller action buttons.
- Image-management actions are seller-only and draft-only.

### Placeholder pricing rules for Phase 1

- Listings page:
  - show `startingBidCents` as the current price
  - show bid count as `0`
- Listing detail page:
  - current bid = `startingBidCents`
  - minimum bid = `startingBidCents`
  - bid count = `0`
- Bid controls for non-owners on `/listings/[id]` are placeholder UI only in Phase 1.

### Fake default draft payload for first upload

- `title`: deterministic placeholder string derived from the current fake data contract
- `description`: deterministic placeholder description
- `location`: deterministic placeholder location
- `category`: deterministic placeholder category
- `condition`: deterministic placeholder condition
- `startingBidCents`: deterministic placeholder amount
- `reservePriceCents`: `null`
- `startsAt`: `null`
- `endsAt`: `now + 7 days`
- `status`: `draft`

The exact fake values should live in one shared helper so Phase 2 can replace only that seam with AI-generated output.

## Cross-Cutting Implementation Work

- Add missing UI primitives consistent with the existing `src/components/ui/` pattern:
  - dialog
  - alert-dialog
  - tabs
  - select
  - textarea
  - simple upload progress helper if needed
- Update the shared status badge so it represents listing statuses:
  - `draft`
  - `scheduled`
  - `active`
  - `ended`
- Keep routes thin and move listing logic into `src/features/listings/`.
- Prefer server components for data reads and client components only for upload flows, tabs, thumbnail swapping, dialog interactivity, and form state.
- Reuse existing auth/session patterns with `requireSession` and seller ownership checks.

## 1A - Schema, Seed Data, `/listings`, and `/dashboard/listings`

### Deliverables

- Listing and listing-image schema added to Drizzle with relations.
- SQL migration checked in under `drizzle/`.
- Listing seed data added to `src/db/seed.ts`.
- Public `/listings` page replaced with DB-backed card grid.
- Protected `/dashboard/listings` page added with status tabs and empty state.
- User menu updated to include `My Listings` while keeping `My dashboard`.
- Status badge updated to support listing statuses.

### Implementation tasks

- Extend `src/db/schema.ts` with `listing` and `listingImage` tables plus relations to `user`.
- Preserve integer cents for money values and timestamp fields for dates.
- Generate and check in the migration after the schema is finalized.
- Add reusable listing enums and listing status helpers in `src/features/listings/`.
- Add query helpers or server-side read functions for:
  - public listings excluding drafts
  - seller listings filtered by status
  - shared listing card data projection
- Replace the placeholder `/listings` cards with real cards that include:
  - main image
  - overlaid color-coded status badge
  - title
  - current price
  - bid count
  - seller name
  - time remaining
  - link to `/listings/[id]`
- Add `/dashboard/listings` as a protected route:
  - default tab `Drafts`
  - tabs for `Drafts | Active | Scheduled | Ended`
  - same card layout as public `/listings`
  - current-user filtering only
  - empty state when the selected tab has no listings
- Update the account menu to link to `/dashboard/listings`.
- Seed data requirements:
  - keep the existing seeded users
  - add `10` listings total
  - include multiple sellers
  - include multiple categories and conditions
  - include `draft`, `scheduled`, `active`, and `ended` statuses
  - attach image URLs from `picsum.photos`
  - ensure enough records exist to exercise every dashboard tab and public listings status

### Test tasks

- Unit tests for listing enums, status helpers, and time-remaining formatting helpers.
- Integration tests for:
  - public `/listings` excluding draft listings
  - public cards linking to `/listings/[id]`
  - `/dashboard/listings` auth protection
  - `/dashboard/listings` status filtering
  - `/dashboard/listings` empty state

### Exit criteria

- Migration applies cleanly in the test harness.
- Seed command creates users plus ten listings with images.
- Public and seller listing grids are DB-backed and status-aware.

## 1B - `/sell` Create Listing Page With Signed Cloudinary Upload

### Deliverables

- `/sell` replaced with the two-panel listing creation layout.
- Signed Cloudinary upload endpoint and server-side signature generation added.
- Client-side upload flow added with local preview, XHR progress, and processing state.
- Draft creation mutation added after successful first image upload.

### Implementation tasks

- Build the `/sell` layout:
  - page header `Create Your Listing`
  - centered two-panel layout below the header
  - left panel `2/3` width, right panel `1/3` width on desktop/tablet
  - no visible page scrollbars on desktop/tablet
  - stacked layout allowed on narrow screens
- Left panel state 1: drop zone
  - large upload icon centered
  - drag-and-drop and click-to-select behavior
  - hidden file input
  - dragover highlight state
- Left panel state 2: local preview
  - render local image preview only
  - `Continue` starts upload
  - `Cancel` clears preview and returns to state 1
- Right panel content:
  - static three-step panel
  - numbered circles with horizontally aligned headings
  - brief descriptions under each heading
- Add a protected signed-upload endpoint or equivalent route handler that:
  - verifies session
  - returns signed Cloudinary upload parameters for listing images
  - scopes uploads to the listing images folder
- Client upload flow:
  - request signed params
  - upload file directly to Cloudinary with XHR progress percentage
  - switch to `Processing…` after Cloudinary upload completes
  - call seller-only draft creation mutation
  - persist the listing row and first listing-image row
  - redirect to `/listings/[id]` after the draft is created
- Keep the first draft publish-ready by applying the fake default payload plus the first uploaded image.
- Add environment parsing or validation for the required Cloudinary variables.
- Add or extend storage utilities to support:
  - signature generation
  - asset deletion

### Test tasks

- Unit tests for fake-default draft generation.
- Integration tests for:
  - `/sell` auth protection
  - two-state upload UI behavior
  - successful first-image draft creation
  - redirect to `/listings/[id]`
  - signed upload endpoint rejecting unauthenticated requests

### Exit criteria

- Authenticated user can upload the first image, create a draft, and land on the detail page.
- Upload progress and processing states are visible during the flow.

## 1C - `/listings/[id]` Display

### Deliverables

- Listing detail page added with the requested top section and two-column layout.
- Draft visibility rules enforced.
- Image gallery added with local main-image swapping.
- Placeholder buyer panel added for non-owners.

### Implementation tasks

- Add `/listings/[id]` server-side read logic:
  - public access for non-draft listings
  - owner-only access for drafts
  - return not found for non-owner draft requests
- Top section layout:
  - large title on the left
  - status badge on the right
  - metadata row for current bid, minimum bid, and time remaining
- Left panel `3/5` width:
  - single wrapping card for all content
  - main image
  - thumbnail strip below, max `5`
  - clicking a thumbnail swaps the main image client-side
  - metadata boxes for seller, location, category, condition
  - description box below metadata
- Right panel `2/5` width:
  - seller controls placeholder area when owner
  - bid controls placeholder when not owner
- Use Phase 1 placeholder pricing:
  - current bid = starting bid
  - minimum bid = starting bid
  - bid count = `0`
  - time remaining and labels are status-aware
- Include seller-only overlay action affordances on thumbnails if helpful for layout completeness, but actual mutations land in later sub-phases.

### Test tasks

- Unit tests for owner access helpers and placeholder pricing helpers.
- Integration tests for:
  - public access to non-draft listings
  - owner-only access to drafts
  - non-owner draft requests returning not found
  - main image and thumbnail rendering

### Exit criteria

- Listing detail page renders for seeded/public records and respects draft privacy rules.
- Gallery supports local thumbnail switching without server mutation.

## 1D - Listing Detail Seller Actions And Edit Modal

### Deliverables

- Seller controls added to the right panel.
- Draft refine modal added with the requested field layout.
- Seller mutations added for save draft, publish, return to draft, and delete draft.

### Implementation tasks

- Add seller action visibility rules:
  - `draft`: `Refine Listing`, `Publish`, `Delete`
  - `scheduled`: `Return to Draft`
  - `active`: `Return to Draft`
  - `ended`: no seller action buttons
- Refine modal requirements:
  - shadcn-style dialog
  - fields:
    - title
    - description
    - location
    - category
    - condition
    - starting bid
    - reserve price optional
    - start at optional
    - ends at
  - layout:
    - title full width
    - description full width
    - location full width
    - category and condition on one row
    - starting bid and reserve price on one row
    - start at and ends at on one row
  - submit button: `Save Draft` only
- Form behavior:
  - React Hook Form + Zod
  - persist updates
  - close modal on successful save
  - do not change listing status on save
- Publish mutation:
  - allowed only from `draft`
  - set `active` when `startsAt` absent
  - set `scheduled` when `startsAt` is in the future
- Return-to-draft mutation:
  - allowed for `scheduled` and `active` in Phase 1
  - return the listing to `draft`
- Delete mutation:
  - draft-only
  - confirmation via alert dialog
  - warning that action is permanent
  - delete Cloudinary assets first
  - hard-delete image rows and listing row after asset deletion
- Keep abandoned edits safe:
  - browser close or modal close does not auto-publish
  - listing stays in draft until the user explicitly publishes

### Test tasks

- Unit tests for draft validation, publish validation, and status-transition helpers.
- Integration tests for:
  - draft save success
  - publish immediate vs scheduled
  - return-to-draft button visibility
  - return-to-draft mutation
  - draft deletion removing DB rows and calling storage deletion

### Exit criteria

- Seller can fully refine and publish a draft from the detail page.
- Status-aware action buttons match the locked Phase 1 rules.

## 1E - Additional Seller Image Upload And Management

### Deliverables

- Seller-only additional image drop zone added below the right panel on draft listings.
- Additional-image upload flow added with progress.
- Choose-main and delete-image mutations added.

### Implementation tasks

- Add seller-only drop zone below the right panel:
  - draft listings only
  - no local preview
  - hidden file input plus drag-and-drop support
  - same signed Cloudinary upload pattern as `/sell`
  - XHR progress shown during upload
- After successful upload:
  - persist the image row immediately
  - append the image to the thumbnail strip
  - enforce the `5 total` cap before upload begins
- Add seller-only image actions:
  - choose another image as main
  - delete image
- Image-management rules:
  - available only to the owner and only in `draft`
  - deleting the last remaining image is disallowed
  - deleting the current main image auto-promotes another existing image to main
  - all image-management controls are hidden or disabled outside `draft`

### Test tasks

- Unit tests for image-limit and main-image selection helpers.
- Integration tests for:
  - additional image upload
  - max-5 enforcement
  - choose-main behavior
  - delete-image behavior
  - cannot delete the last remaining image

### Exit criteria

- Seller can upload additional images, change the main image, and delete non-final images on a draft listing.
- Thumbnail strip stays consistent with persisted image state.

## Final Verification Checklist

- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Completion Notes

- Update `tasks/SPEC.md` tracker checkboxes as each Phase 1 milestone lands.
- If implementation scope changes, update this file before coding so later sessions inherit the new source of truth.
