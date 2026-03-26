# Phase 2 Execution TODO

Created: 2026-03-25
Status: Planning complete, implementation pending

## Objective

Deliver Phase 2 AI seller tooling as a sequence of implementable sub-phases that can be executed in separate sessions without reopening `tasks/SPEC.md`.

## Execution Order

- `2A` blocks all later Phase 2 work.
- `2B` depends on `2A`.

## Locked Decisions

- `tasks/TODO.md` is the active standalone execution document for Phase 2.
- `tasks/SPEC.md` remains the concise phase summary and tracker.
- Shared AI model policy for all Phase 2 features:
  - primary: `google/gemini-2.5-flash-lite`
  - fallback: `openai/gpt-4o-mini`
- One user action equals one logical AI request.
- Internal model fallback does not consume extra quota.
- AI features use the Vercel AI SDK through Vercel AI Gateway.
- Add `AI_GATEWAY_API_KEY` to `.env.example` during implementation.
- Local development continues to read secrets from `.env.local`.
- Shared AI logic stays server-only under `src/server/`.
- Phase 2 does not persist prompts or raw model outputs in the database.
- Add `listing.aiDescriptionGenerationCount` as `integer not null default 0`.
- Smart Listing Creator is available only on `/sell`.
- Smart Listing Creator input is the uploaded listing image only.
- Smart Listing Creator does not use seller profile data, session-derived personalization, or other user context.
- Smart Listing Creator generates:
  - `title`
  - `description`
  - `category`
  - `condition`
  - `suggestedStartingPriceCents`
- Smart Listing Creator never suggests reserve price.
- Smart Listing Creator must save only existing category enum values.
- Invalid or low-confidence category output resolves to `other`.
- Smart Listing Creator success keeps the current redirect-to-detail flow after draft creation.
- Smart Listing Creator failure after both models fail keeps the user on `/sell`.
- Smart Listing Creator failure UI must offer:
  - `Retry AI`
  - `Continue without AI`
- Manual non-AI fallback draft payload is locked to:
  - `title`: `Untitled draft`
  - `description`: `Add a seller-written description before publishing.`
  - `location`: `Add location`
  - `category`: `other`
  - `condition`: `good`
  - `startingBidCents`: `100`
  - `reservePriceCents`: `null`
  - `startsAt`: `null`
  - `endsAt`: `now + 7 days`
  - `status`: `draft`
- The existing seed-based rich fake-default draft generation is removed from the main `/sell` success path.
- AI Description Enhancer is available only to the draft owner on `/listings/[id]/edit`.
- AI Description Enhancer tone options are:
  - `concise`
  - `max_hype`
  - `sarcastic`
  - `friendly`
- AI Description Enhancer UI uses the existing `Select` primitive as a dropdown.
- Default description-enhancer tone is `friendly`.
- AI Description Enhancer streams text into an on-page preview panel.
- AI Description Enhancer post-generation buttons are:
  - `Regenerate`
  - `Accept`
  - `Cancel`
- Description enhancement is capped at `10` total user-initiated AI runs per listing.
- The initial generate counts toward the limit.
- Every regenerate counts toward the limit.
- Changing tone alone does not count toward the limit.
- Remaining runs display as `10 - aiDescriptionGenerationCount`.
- When the limit is reached, generate/regenerate controls are disabled and a limit message is shown.
- `Accept` updates the current form description in client state only.
- The user must still click `Save Draft` to persist the accepted description to the database.
- There is no special undo after `Accept`; manual editing remains the recovery path.
- Description enhancement uses a route handler, not a server action, because the response must stream.
- Seller ownership and `draft` status are validated before enhancement quota is consumed.
- Quota increments once per accepted generate/regenerate request.
- Primary-to-fallback handoff within one request does not increment quota again.
- Description enhancer prompt input is limited to:
  - current listing title
  - current listing category
  - current listing condition
  - current listing description
- Description enhancer must not use seller profile data or unrelated user context.
- Description enhancer output rules:
  - `50-200` words
  - tone-appropriate
  - never invent features or specs not present in the source description
- Stream provisional text into the preview panel while generating.
- Only enable `Accept` after the completed response passes final validation.
- Validation failure or total AI failure must preserve the existing textarea value and show a recoverable error.

## Shared Interfaces And Rules

### Database changes

- Add `aiDescriptionGenerationCount` to the `listing` table.
- Type: integer
- Nullability: non-null
- Default: `0`
- Purpose: persist the per-listing AI Description Enhancer usage count.

### Environment

- Add `AI_GATEWAY_API_KEY` to `.env.example`.
- Keep `.env.local` as the local-development secret source.
- Retain existing Cloudinary variables unchanged.

### Shared AI service contract

- Expand `src/server/ai.ts` into the shared Phase 2 AI boundary.
- Keep the module server-only.
- Responsibilities:
  - model selection and fallback orchestration
  - Vercel AI Gateway provider wiring
  - structured object generation for Smart Listing Creator
  - streamed text generation for AI Description Enhancer
  - shared fallback semantics where one user action equals one request
- The service module should expose clear seams for:
  - Smart Listing Creator structured generation
  - Description Enhancer streamed generation
  - primary-to-fallback retry within the same request
- AI output must always be validated before it can affect saved data or accepted UI state.

### Shared schemas and normalization

- Smart Listing Creator structured result schema:
  - `title`
  - `description`
  - `category`
  - `condition`
  - `suggestedStartingPriceCents`
- Category normalization rules:
  - accept only existing listing category enums
  - coerce invalid or low-confidence category output to `other`
- Condition normalization rules:
  - accept only existing listing condition enums
  - reject invalid condition output and treat it as AI failure for that request
- Price normalization rules:
  - output is integer cents
  - output must be positive
  - reserve price is not part of the schema
- Description Enhancer schema/rules:
  - tone enum: `concise | max_hype | sarcastic | friendly`
  - final validated output length: `50-200` words
  - reject outputs that invent features/specs beyond the source description

### Shared prompt rules

- Do not use seller profile data, account history, or unrelated session context.
- Smart Listing Creator prompt input is the uploaded listing image only.
- Description Enhancer prompt input is listing text plus selected tone only.
- Prompts must explicitly instruct the model not to invent facts, accessories, specs, defects, provenance, or condition details that are not evident from the allowed input.

## 2A - Smart Listing Creator On `/sell`

Status: Not started

### Deliverables

- Shared AI server module introduced for structured generation and fallback.
- `/sell` first-image draft creation flow upgraded from fake seeded defaults to AI-generated suggestions on success.
- Smart Listing Creator limited to the uploaded image as model input.
- AI-generated listing draft saves:
  - title
  - description
  - category
  - condition
  - starting bid
- Total AI failure keeps the user on `/sell` with retry and manual fallback actions.
- `Continue without AI` creates a draft with the locked manual fallback payload.

### Implementation tasks

- Add the Phase 2 dependency and environment documentation needed for Vercel AI Gateway and the Vercel AI SDK.
- Expand `src/server/ai.ts` into a production-facing AI boundary with:
  - primary model selection
  - fallback model selection
  - Vercel AI Gateway configuration
  - structured object generation
  - deterministic fallback orchestration
- Add shared Smart Listing Creator prompt builder(s) and result schema(s).
- Add shared normalization helpers for:
  - category mapping to existing enums
  - condition validation against existing enums
  - starting-price cents normalization
- Replace the current seed-based fake-default success path in the draft-creation mutation flow.
- Keep the existing Cloudinary upload step first.
- After Cloudinary upload succeeds:
  - send the uploaded image as the only model input
  - run Smart Listing Creator with the primary model
  - retry the same logical request against the fallback model on provider/model failure
  - validate and normalize the result
  - create the draft row and first image row using the AI result
  - set `reservePriceCents` to `null`
  - keep `startsAt` as `null`
  - set `endsAt` to `now + 7 days`
  - set `status` to `draft`
  - redirect to `/listings/[id]`
- Total AI failure path on `/sell`:
  - keep the user on the page
  - preserve the uploaded image state if practical
  - show a recoverable error message
  - show `Retry AI`
  - show `Continue without AI`
- `Retry AI` behavior:
  - rerun the same Smart Listing Creator request using the already uploaded image reference
  - do not upload the image to Cloudinary again unless the client lost the upload result
- `Continue without AI` behavior:
  - create the draft immediately with the locked manual fallback payload
  - attach the already uploaded image as the main image
  - redirect to `/listings/[id]`
- Update copy in the `/sell` UI to reflect AI-assisted draft creation instead of deterministic placeholder generation.
- Ensure category and condition values saved by Smart Listing Creator match the existing Drizzle enum-backed listing fields.
- Preserve current auth rules for `/sell`.

### Test tasks

- Unit tests for:
  - Smart Listing Creator prompt shaping from uploaded image input only
  - category normalization to existing enum values
  - invalid or low-confidence category mapping to `other`
  - condition validation
  - starting-price normalization into positive integer cents
  - one-request primary-to-fallback orchestration
  - manual non-AI fallback payload generation
- Integration tests for:
  - `/sell` auth protection remains intact
  - successful AI-assisted first-image draft creation
  - redirect to `/listings/[id]` after AI success
  - total AI failure showing retry and manual fallback controls
  - `Continue without AI` creating a draft with the locked fallback payload
  - total AI failure preserving manual listing creation access instead of blocking the seller

### Exit criteria

- An authenticated seller can upload one image on `/sell`, receive AI-generated draft details, and land on the draft detail page.
- The saved category always matches the existing category enum set.
- Total AI failure does not block listing creation because `Continue without AI` remains available.
- The old seed-based fake-default success path is no longer the default draft-creation flow.

## 2B - AI Description Enhancer On `/listings/[id]/edit`

Status: Not started

### Deliverables

- Draft-owner-only AI Description Enhancer added to the existing edit page.
- Tone dropdown added with `Concise`, `Max-hype`, `Sarcastic`, and `Friendly`.
- Generated description text streams into a preview panel below the controls.
- Post-generation actions added:
  - `Regenerate`
  - `Accept`
  - `Cancel`
- Loading spinner shown while AI is generating.
- Regeneration/generation usage count persisted per listing with max `10`.

### Implementation tasks

- Add the `aiDescriptionGenerationCount` column to the listing schema and generate/check in the Drizzle migration.
- Extend listing queries for the edit page so the editor receives the persisted generation count.
- Extend listing mutation/query types so the client can render remaining generations.
- Add a description-enhancer tone enum and any shared labels/helpers needed for UI rendering.
- Add prompt builder(s) for description enhancement using only:
  - title
  - category
  - condition
  - existing description
  - selected tone
- Add final validation helpers for:
  - `50-200` word length
  - tone selection
  - “no invented specs/features” instruction compliance
- Add a route handler for streamed description generation.
- Route-handler responsibilities:
  - require authenticated session
  - load the requested listing
  - verify seller ownership
  - verify `draft` status
  - verify remaining quota before generation starts
  - increment quota once for the accepted request
  - stream model output into the response
  - retry against the fallback model within the same request if the primary fails before a valid stream is established
- Update the draft editor UI near the description field:
  - add the tone dropdown
  - add `Refine description with AI`
  - show remaining runs
  - show spinner/loading state while generating
  - show a preview panel below the controls
- Preview panel behavior:
  - stream provisional text as it arrives
  - keep the original textarea value untouched during generation
  - after a successful validated completion, show `Regenerate`, `Accept`, and `Cancel`
  - on validation failure, show an error and keep the textarea unchanged
- `Accept` behavior:
  - overwrite the React Hook Form description field with the generated text
  - do not persist to DB yet
- `Cancel` behavior:
  - discard the current generated preview
  - keep the form description as-is
- `Regenerate` behavior:
  - use the currently selected tone
  - consume one additional generation if quota remains
- Limit-reached behavior:
  - disable generate/regenerate controls
  - show a clear remaining-count/limit-reached message
- Ensure the existing `Save Draft` flow still controls database persistence after `Accept`.
- Preserve existing edit-page auth and draft-only access rules.

### Test tasks

- Unit tests for:
  - tone prompt shaping
  - `50-200` word validation
  - quota accounting helpers
  - one-request/one-quota behavior with internal fallback
  - remaining-generation display helpers if extracted
- Integration tests for:
  - draft-owner-only access to the AI Description Enhancer
  - tone selection driving the request payload
  - streaming preview rendering
  - loading spinner while generation is in progress
  - `Accept` overwriting form state only
  - `Cancel` preserving the current textarea content
  - `Regenerate` consuming quota
  - limit-reached UI disabling generate/regenerate
  - accepted description persisting only after the user clicks `Save Draft`
  - validation or AI failure preserving the existing textarea value

### Exit criteria

- A draft owner can generate, preview, regenerate, and accept streamed AI description text on `/listings/[id]/edit`.
- The accepted description does not persist until `Save Draft` succeeds.
- Generation usage is persisted per listing and capped at `10`.
- Limit-reached behavior is visible and enforced in both UI and server-side request validation.

## Final Verification Checklist

- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Completion Notes

- Update `tasks/SPEC.md` tracker checkboxes as shared AI infrastructure, `2A`, `2B`, migration work, and test milestones land.
- If Phase 2 scope changes, update this file before coding so later sessions inherit the new source of truth.
