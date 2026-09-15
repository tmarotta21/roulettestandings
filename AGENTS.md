# Roulette Standings

Phase 1: commissioner dashboard, roulette engine, square PNG download, Monday cron.
Phase 2 (later): public username gate, league toggle, matchups/schedule/bracket/history, admin league-ID form, Sync button, Sleeper chat upload.

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

`npm test` includes live Sleeper checks: WIN/TIE/LOSS vs `roster.settings` and PF vs `matchup.points` for 2025 Shadynasty and the five 2026 leagues.
