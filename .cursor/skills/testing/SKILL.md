---
name: testing
description: When and how to add tests for scoring, Sleeper, and UI. Use when adding features, fixing bugs, writing tests, or deciding unit vs live Sleeper checks.
---

# Testing

| Command | What |
|---|---|
| `npm run test:unit` | `lib/*.test.ts` except `*.live.test.ts` — CI bar, no network |
| `npm run test:sleeper` | `lib/*.live.test.ts` — local only |
| `npm run lint` | eslint |
| `npx tsc --noEmit` | types |

`npm test` is the same as `test:unit`. The unit script excludes `*.live.test.ts` (`lib/*.test.ts` would match them). Do not put live Sleeper calls in non-live test files.

## Where tests go

- Scoring / standings math → `lib/roulette.test.ts` plus `lib/sleeper-reconcile.test.ts`
- History aggregators (H2H, all-time, bracket roles, seasons grid, `scoreFromStats`) → `lib/history.test.ts`. UI must call those functions; do not re-derive records in components.
- Sleeper client (`@/lib/sleeper`) → `lib/sleeper.test.ts`. Do not add a second HTTP helper.
- After scoring or reconcile changes, run `npm run test:sleeper` locally. Do not skip the 2025 Shadynasty live net. CI does not run it.

## UI

If the change is UI, layout, routing, or rendered data, exercise the real flow in the browser (or the closest substitute). A single screenshot is not enough. Check other routes that share the same state.

## Before a PR

`npm run lint`, `npx tsc --noEmit`, `npm run test:unit` must pass.
