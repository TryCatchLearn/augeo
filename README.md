# Augeo

Augeo is a Next.js 16 auction marketplace prototype built with TypeScript, BetterAuth, Drizzle ORM, and Tailwind CSS v4.

## Getting Started

Install dependencies, then start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Commands

```bash
npm run test:run
npm run test:unit
npm run test:integration
npm run test:coverage
```

Run a single test file with:

```bash
npm run test:run -- tests/integration/db/test-database.test.ts
```

## Testing Conventions

- `tests/unit/` holds pure unit tests for helpers, schemas, and domain rules.
- `tests/integration/` holds DB-backed and app-surface integration tests.
- `tests/helpers/` contains reusable harness code such as temp DB setup, session helpers, time helpers, and mock adapters.
- `tests/factories/` contains data factories for seeded records.

DB-backed integration tests use a temporary SQLite database file per test harness. The harness applies the checked-in Drizzle migrations from `drizzle/` before each suite interacts with the database, so integration tests exercise the real schema shape instead of mock tables.

Coverage is reported through Vitest with 80% thresholds applied to the shared `src/lib/` and `src/features/` code that Phase 0 establishes as the main home for domain logic and reusable server-side helpers.

## Project Commands

```bash
npm run lint
npm run build
npm run format
```
