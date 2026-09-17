# Roulette Standings

Phase 1: commissioner dashboard, roulette engine, square PNG download, Monday cron.
Phase 2: public username gate, league toggle, matchups/schedule/bracket/history, admin league-ID form, Sync button. Sleeper chat upload stays fail-closed until the commissioner explicitly approves sending messages in league chats.

## Scoring

- WIN = H2H win (strictly higher weekly score). A tie is not a win.
- Matchup PTS: winner 2, loser 0, H2H tie both 1.
- ROU: top `floor(n/2)` weekly scorers. Ties for the last spot all get ROU.
- PTS = `2 * WIN + TIE + ROU`.
- PF = sum of weekly points.
- Rank PTS desc, then PF desc.
- Regular season only: weeks `1 .. playoff_week_start - 1`.
- Playoff highlight count = Sleeper `settings.playoff_teams`. PTS+PF tie for last seed: highlight both.

Import Sleeper from `@/lib/sleeper`. Scoring stays in `@/lib/roulette`.

## Phase 1 leagues (hardcoded)

- LoSRB — `1312059475418435584`
- MFL — `1312064033167282176`
- Shadynasty Fantasy Lounge — `1312897670829862912`
- Game of Dyno — `1318054540800462848`
- League of Unwavering Faith — `1312903288433172480`

2025 Shadynasty for engine checks: `1180599038981910528`.

`npm run test:unit` (`npm test`) runs `lib/*.test.ts` except `*.live.test.ts` (no network). `npm run test:sleeper` runs `lib/*.live.test.ts` (WIN/TIE/LOSS vs `roster.settings` and PF vs `matchup.points` for 2025 Shadynasty and the five 2026 leagues). Use live tests locally when changing scoring or Sleeper; CI does not run them.

## Collaboration

Never commit, push, or merge to `main`. Branch from latest `main` (`feat/`, `fix/`, `chore/`). One independently reviewable outcome per PR. Squash-merge on GitHub.

Before a PR: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`. Production deploys only by merging to `main`. Never `vercel --prod`, never promote/rollback, never set `SLEEPER_CHAT_POST`.

If a change invents a durable convention, update the matching skill in that same PR.

When committing, opening, or reviewing a PR, or touching tests or deploy, read `.cursor/skills/git-pr`, `code-review`, `testing`, or `deploy`. Domain work: `sleeper`, `roulette-scoring`, `standings-image`, `weekly-final`.
