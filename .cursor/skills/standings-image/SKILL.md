---
name: standings-image
description: Square spreadsheet-style roulette standings PNG via next/og ImageResponse. Use when changing the share image, OG route, Download button, playoff highlight, or column layout.
---

# Standings image

Route: `GET /api/og/[sleeperLeagueId]` using `ImageResponse` from `next/og`.

## Canvas

- Square: `width === height`. 10-team leagues keep the same square with extra vertical padding.
- Light spreadsheet look (not the dark admin shell).
- One row per team, ranked PTS then PF.
- Left label = Sleeper username.
- Four stat columns only: **WIN**, **ROU**, **PTS**, **PF**. Header may include season year. No PPG, no W-L.
- Unique stable team row tints (hash username). White/uncolored WIN cells. PF green color scale.
- Playoff rows (from `playoff_teams`) must be obvious: left bar + bolder username.

## Download

Dashboard **Download** must save the PNG (`Content-Disposition: attachment`), filename `{league-slug}-{season}-w{week}.png`. Preview alone is not enough.
