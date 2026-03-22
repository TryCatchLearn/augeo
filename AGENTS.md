# AGENTS.md

## Project Overview

- App: `augeo`
- Framework: Next.js 16 App Router
- Language: TypeScript
- UI: React 19, Tailwind CSS v4, Base UI, shadcn-style component structure
- Auth: Better Auth
- Data: Drizzle ORM with checked-in SQL migrations under `drizzle/`
- Testing: Vitest + Testing Library + jsdom
- Linting/formatting: Biome
- Package manager: npm (`package-lock.json` is committed)

This repository is still early-stage, but it is no longer a starter. There is already working app structure for auth, listings, shared UI, server adapters, database access, and tests. Prefer small, clean changes that strengthen the existing shape instead of introducing a new architecture.

## Working Agreement For Agents

- Make focused edits that match the existing architecture instead of introducing a new pattern.
- Check the current file structure and scripts before making assumptions.
- Do not remove or overwrite user changes you did not make.
- Keep changes easy to review. Favor simple components and direct data flow.
- When adding UI, preserve the existing Tailwind token system in `src/app/globals.css`.
- Prefer updating the existing feature/server/test structure over creating new top-level patterns.
- If you add a new command or workflow requirement, reflect it in repo docs when appropriate.

## Repository Structure

- `src/app/`: App Router routes, layouts, templates, and route handlers
- `src/components/`: shared presentational components
- `src/components/ui/`: reusable UI primitives in the existing shadcn-style pattern
- `src/features/`: feature-scoped domain logic, schemas, client helpers, and feature components
- `src/server/`: server-only integrations and adapters such as auth, AI, and storage
- `src/db/`: database client, schema, and seed utilities
- `src/lib/`: cross-cutting utilities such as env parsing and class name helpers
- `tests/unit/`: unit tests for pure logic and helpers
- `tests/integration/`: integration tests for app surfaces and DB-backed flows
- `tests/helpers/`, `tests/factories/`, `tests/mocks/`: reusable test support code
- `drizzle/`: checked-in SQL migrations and migration metadata
- `public/`: static assets

## Commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production server: `npm run start`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Format: `npm run format`
- Tests: `npm run test:run`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- Coverage: `npm run test:coverage`
- Generate Drizzle migrations: `npm run db:generate`
- Apply Drizzle migrations: `npm run db:migrate`
- Seed local data: `npm run seed`

## Code Style

- Use TypeScript throughout.
- Prefer server components by default. Add `"use client"` only when client-side interactivity is required.
- Prefer server actions for authenticated mutations whenever possible. Use API routes only when the browser truly needs an HTTP endpoint, such as direct third-party uploads or machine-consumable integrations.
- Use the `@/` alias for imports rooted in `src/`.
- Reuse `cn()` from `src/lib/utils.ts` for conditional class names.
- Prefer `lucide-react` for icons instead of custom SVG icon components unless a custom brand mark is explicitly required.
- Follow existing formatting conventions enforced by Biome rather than hand-formatting.
- Keep components small and composable. If a component is generic and reusable, place it under `src/components/`.
- Keep feature-specific code inside `src/features/<feature>/` unless it is clearly shared across features.
- Put server-only code in `src/server/` or another server-only boundary, not in client components.
- Keep route files in `src/app/` thin when possible by leaning on feature modules and shared components.
- Update schema, migrations, and any affected test harnesses together when changing persisted data.
- Prefer components under 150 lines. If a component exceeds this, evaluate whether it contains distinct concerns (Data fetching, sub-UI sections, reusable logic) and split at those natural boundaries. Always extract stateful logic into custom hooks. Never split purely to meet a line count.

## Styling Notes

- Tailwind v4 is configured through `src/app/globals.css`.
- Theme values are exposed as CSS variables; prefer those tokens over ad hoc color values when possible.
- Existing UI primitives use utility-first styling and `class-variance-authority`.
- Avoid introducing a second styling system.

## Test Infrastructure

- Vitest is configured in `vitest.config.ts` with a shared setup file at `tests/setup/vitest.setup.ts`.
- Tests run in `jsdom` and use Testing Library plus `@testing-library/jest-dom`.
- Unit tests belong under `tests/unit/` for pure domain logic, schemas, utilities, and session helpers.
- Integration tests belong under `tests/integration/` for route-level behavior, rendered app surfaces, and DB-backed flows.
- Reuse helpers from `tests/helpers/`, factories from `tests/factories/`, and mocks from `tests/mocks/` instead of rebuilding harness code inline.
- DB-backed integration tests should exercise the checked-in Drizzle migrations rather than ad hoc mock schema definitions when possible.
- When adding logic with meaningful branching or validation rules, add or update tests in the same change.

## Definition Of Done

- Run `npm run test:run`.
- Run `npx tsc --noEmit`.
- Run `npm run lint`.
- Run `npm run build` for changes that could affect production behavior, including app routes, config, server code, database code, or shared UI.
- If a command cannot be run locally, call that out clearly in the handoff.

## Current State

- The app includes auth flows, listings/domain logic, dashboard/login/register/sell routes, shared header/footer/navigation components, and server adapters.
- The repo already has both unit and integration coverage, including DB harness tests.
- Product direction is still flexible, so avoid overfitting the codebase to speculative requirements.

## Safe Defaults For Future Changes

- Prefer updating existing files over creating many new abstractions.
- If adding a new shared UI primitive, keep it consistent with the existing `src/components/ui/` pattern.
- If adding dependencies, justify them against the current lightweight setup.
- If a request is ambiguous, choose the smallest implementation that keeps future iteration easy.
- Prefer adding feature logic to an existing feature folder before creating a new cross-cutting abstraction.
- If you introduce a new folder or architectural boundary, make sure its purpose is obvious from the name and consistent with the rest of `src/`.
