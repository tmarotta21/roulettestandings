---
name: sleeper
description: Sleeper public API client for roulettestandings. Use when adding or changing fetches for NFL state, leagues, users, rosters, matchups, brackets, previous_league_id history, or liveMatchupPoints / pairMatchups.
---

# Sleeper

Import from `@/lib/sleeper`. Do **not** add a second HTTP helper or copy `@rotorooster/sleeper` as a workspace package.

```ts
import { getLeague, getMatchups, getNflState } from "@/lib/sleeper";
```

Base: `https://api.sleeper.app/v1`. Always `cache: "no-store"`. Throw `SleeperError` on non-OK.

## Required helpers

| Function | Path |
|---|---|
| `getNflState` | `/state/nfl` — week = `display_week ?? week ?? 1` |
| `getLeague` | `/league/{id}` — read `settings.playoff_teams`, `settings.playoff_week_start`, `previous_league_id` |
| `getLeagueUsers` | `/league/{id}/users` |
| `getRosters` | `/league/{id}/rosters` |
| `getMatchups` | `/league/{id}/matchups/{week}` |
| `getWinnersBracket` | `/league/{id}/winners_bracket` |
| `getUser` | `/user/{usernameOrId}` |
| `getUserLeagues` | `/user/{userId}/leagues/nfl/{season}` |
| `walkPreviousLeagues` | follow `previous_league_id` with a seen-set. Use `normalizeSleeperLeagueId` so `"0"` / empty means no predecessor (never fetch `/league/0`). |

## Points and pairing

- `liveMatchupPoints`: `max(points, sum(starters_points), sum(players_points[starter]))`
- `pairMatchups`: group by `matchup_id`; `null` id is a bye (solo)

Do not trust `roster.settings.wins` for roulette **PTS**. Recompute from weekly matchups in `@/lib/roulette`.
