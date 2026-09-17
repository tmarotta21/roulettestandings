---
name: weekly-final
description: Detect when an NFL week is complete and generate Monday-night standings PNGs. Use when changing cron, ESPN scoreboard checks, or weekly image generation.
---

# Weekly final

Sleeper has no “all NFL games final” flag. Use ESPN:

`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week={n}&seasontype=2`

A week is final when every event has `status.type.completed === true` (or equivalent completed state). Empty/error scoreboard is not final.

## Cron

- Path: `GET /api/cron/weekly-images` with Bearer `CRON_SECRET`.
- Schedule: hourly `0 2-7 * * 2` UTC (Monday evening through early Tuesday ET).
- If the week is not final, or images for that week already exist, no-op.
- On final: sync matchups, compute roulette, generate/store PNGs for every hosted league.
- Chat upload is fail-closed. Do not post to Sleeper league chat unless the commissioner has explicitly approved sending messages **and** `SLEEPER_CHAT_POST=1` plus a valid `SLEEPER_TOKEN` are set. Missing/expired token or no approval → dashboard Download only. Never send a test message to a live league chat.
