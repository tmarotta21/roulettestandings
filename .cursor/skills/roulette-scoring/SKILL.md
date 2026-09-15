---
name: roulette-scoring
description: Roulette standings scoring rules. Use when computing WIN, ROU, PTS, PF, playoff rows, weekly matchup points, or adding scoring tests.
---

# Roulette scoring

Keep logic in `@/lib/roulette` as pure functions. Regular season only: weeks `1 .. playoff_week_start - 1`. Skip the current NFL week until it is final.

## Per week

- Pair sides by `matchup_id`.
- **Matchup PTS:** winner 2, loser 0, **H2H tie both 1**. A tie is not a WIN.
- **ROU:** +1 if weekly score is in the top `floor(n/2)` (6 of 12, 5 of 10). Eligible on a win, loss, or tie.
- If two or more teams tie for the last roulette spot, **all of them get ROU**. Do not break the cutoff with PF, username, or matchup result.

## Season totals

- **WIN** = H2H wins (strictly higher score).
- **TIE** = H2H ties.
- **ROU** = count of weeks with a roulette point.
- **PTS** = `2 * WIN + TIE + ROU`.
- **PF** = sum of weekly Sleeper points.
- Rank **PTS desc, then PF desc**.

## Sleeper source of truth

WIN/PF must match Sleeper, not only our internal totals:

- **WIN / TIE / LOSS** = Sleeper `roster.settings.wins|ties|losses` for the same completed regular-season weeks.
- **PF** = sum of Sleeper `matchup.points` for those weeks (also must match `liveMatchupPoints` once a week is final).

`lib/sleeper-reconcile.ts` plus `lib/sleeper-reconcile.test.ts` and `lib/sleeper-reconcile.live.test.ts` are the regression net when a leaguemate disputes standings. Do not skip the live tests for a completed season (2025 Shadynasty).

## Playoffs

Playoff count = Sleeper `settings.playoff_teams`. After ranking, those rows are in playoff position. If two teams are tied on PTS **and** PF for the last seed, highlight **both**.
