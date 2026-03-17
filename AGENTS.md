# AGENTS.md

## Project Overview

- App: `augeo`
- Framework: Next.js 16 App Router
- Language: TypeScript
- UI: React 19, Tailwind CSS v4, Base UI, shadcn-style component structure
- Linting/formatting: Biome
- Package manager: npm (`package-lock.json` is committed)

This repository is currently very close to the default starter. Treat it as an early-stage app and prefer small, clean changes over premature abstraction.

## Working Agreement For Agents

- Make focused edits that match the existing architecture instead of introducing a new pattern.
- Check the current file structure and scripts before making assumptions.
- Do not remove or overwrite user changes you did not make.
- Keep changes easy to review. Favor simple components and direct data flow.
- When adding UI, preserve the existing Tailwind token system in `src/app/globals.css`.

## Repository Structure

- `src/app/`: App Router entrypoints, layout, global styles
- `src/components/ui/`: shared UI primitives
- `src/lib/`: small utilities such as class name helpers
- `public/`: static assets

## Commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`
- Format: `npm run format`

## Code Style

- Use TypeScript throughout.
- Prefer server components by default. Add `"use client"` only when client-side interactivity is required.
- Use the `@/` alias for imports rooted in `src/`.
- Reuse `cn()` from `src/lib/utils.ts` for conditional class names.
- Follow existing formatting conventions enforced by Biome rather than hand-formatting.
- Keep components small and composable. If a component is generic and reusable, place it under `src/components/`.

## Styling Notes

- Tailwind v4 is configured through `src/app/globals.css`.
- Theme values are exposed as CSS variables; prefer those tokens over ad hoc color values when possible.
- Existing UI primitives use utility-first styling and `class-variance-authority`.
- Avoid introducing a second styling system.

## Quality Checks

- Run `npm run lint` after meaningful code changes.
- Run `npm run build` when changing app structure, routing, config, or anything likely to affect production output.
- There is no dedicated test suite yet. If you add logic with meaningful branching, consider adding tests only if the project introduces a test runner first.

## Current State

- `src/app/page.tsx` still contains starter content.
- `src/app/layout.tsx` still contains starter metadata.
- The repo includes a base `Button` primitive in `src/components/ui/button.tsx`.

Agents should assume the product direction is still flexible and avoid overfitting the codebase to speculative requirements.

## Safe Defaults For Future Changes

- Prefer updating existing files over creating many new abstractions.
- If adding a new shared UI primitive, keep it consistent with the existing `src/components/ui/` pattern.
- If adding dependencies, justify them against the current lightweight setup.
- If a request is ambiguous, choose the smallest implementation that keeps future iteration easy.
