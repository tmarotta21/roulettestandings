---
name: Roulette standings phase 2
overview: Build the public roulettestandings app on top of the existing phase 1 engine. Do not provision GitHub, Vercel, Neon, or Sleeper tokens. Assume the commissioner already connected those.
---

# Roulette standings — phase 2

Work in this repo (`roulettestandings`). Phase 1 already has the scoring engine, PIN dashboard, square PNG download, Monday cron, and Sleeper reconcile tests. **Do not rebuild those.** **Do not create GitHub remotes, Vercel projects, Neon databases, or capture `SLEEPER_TOKEN`.** If `DATABASE_URL` / Vercel env is missing, stop and tell the user which manual step is incomplete.

Follow project skills in `.cursor/skills/` (`sleeper`, `roulette-scoring`, `standings-image`, `weekly-final`) plus tournamentleagues patterns cited below.

## Product

Public site at the Vercel deployment (name: **roulettestandings**).

1. **Landing** — username input (Sleeper username). `getUser` then `getUserLeagues(season)` intersected with hosted roulette leagues (DB registry ∪ hardcoded seed in `lib/leagues.ts`). Cookie the username. If none match, say so.
2. **Standings page** — roulette table (WIN, ROU, PTS, PF) for the selected league. League toggle among *that user’s* hosted leagues. Year history dropdown via `previous_league_id` / `walkPreviousLeagues`. Playoff highlight from `settings.playoff_teams`. **Download** still saves the square PNG.
3. **Matchups** under the table — copy [tournamentleagues matchup-table.tsx](file:///Users/totsrocket/Documents/Projects/tournamentleagues/components/matchup-table.tsx) + `pairMatchups` by `matchup_id`.
4. **Tabs** — weekly schedule ([tournamentleagues weekly/page.tsx](file:///Users/totsrocket/Documents/Projects/tournamentleagues/app/weekly/page.tsx)); playoff bracket from `getWinnersBracket` ([playoff-bracket.tsx](file:///Users/totsrocket/Documents/Projects/tournamentleagues/components/playoff-bracket.tsx)).
5. **Admin** — PIN-gated `/admin` form to add/remove Sleeper `league_id`s; `getLeague` to name them; upsert Neon; `syncAll()`. Hardcoded five IDs remain seed/fallback.
6. **Sync** — copy [LiveSyncButton](file:///Users/totsrocket/Documents/Projects/tournamentleagues/components/live-sync-button.tsx) + [POST /api/live](file:///Users/totsrocket/Documents/Projects/tournamentleagues/app/api/live/route.ts) (15s cooldown) and [maybeRefresh](file:///Users/totsrocket/Documents/Projects/tournamentleagues/lib/maybe-refresh.ts) (live ~45s, full ~5min). Show on public standings and commissioner dashboard.
7. **Sleeper chat upload** — after Monday cron PNGs, post each image to that league’s chat via unofficial `https://sleeper.com/graphql` and `SLEEPER_TOKEN`. Never commit the token. If missing/expired, fail closed to dashboard Download. Do not invent a half-working bot.

Scoring rules stay exactly as phase 1 (H2H tie = 1 PTS each; ROU last-spot ties all get ROU; rank PTS then PF). Keep `npm test` including live WIN/PF reconcile tests.

## Implementation notes

- Prisma/Neon is required for admin registry, sync snapshots, and generated-image records. Run `prisma migrate deploy` only if `DATABASE_URL` is already in `.env.local` from `vercel env pull`.
- Public username gate is not OAuth; cookie + Sleeper public API.
- Verify in the browser: username → standings → league toggle → year history → matchups → weekly tab → bracket tab → Download PNG → Sync → admin add/remove league. Do not declare done from a screenshot alone.

## Out of scope

- Creating GitHub/Vercel/Neon resources
- Changing roulette math
- Posting to Sleeper chat without `SLEEPER_TOKEN`
