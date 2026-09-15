# Roulette Standings

Commissioner dashboard for Sleeper roulette standings. Phase 1 generates a square PNG (WIN / ROU / PTS / PF) after the NFL week is final. Paste it into league chat; automated Sleeper chat upload is phase 2.

## Scoring

- Win = 2 standings points, loss = 0, H2H tie = 1 each
- ROU = top half of weekly scores (`floor(n/2)`); ties for the last spot all get ROU
- PTS = `2 × WIN + TIE + ROU`
- Rank PTS, then PF
- Playoff highlight uses Sleeper `settings.playoff_teams`

## Local

```bash
cp .env.example .env.local
# set ADMIN_PIN
npm install
npm test
npm run dev
```

Open `/login`, then download PNGs from `/`.
