# Roulette Standings

Public roulette standings for hosted Sleeper leagues, plus a password-gated commissioner dashboard.

## Scoring

- Win = 2 standings points, loss = 0, H2H tie = 1 each
- ROU = top half of weekly scores (`floor(n/2)`); ties for the last spot all get ROU
- PTS = `2 × WIN + TIE + ROU`
- Rank PTS, then PF
- Playoff highlight uses Sleeper `settings.playoff_teams`

## Local

```bash
cp .env.example .env.local
# set ADMIN_PASSWORD (or ADMIN_PIN) and DATABASE_URL from `vercel env pull`
# Neon may provide DATABASE_URL_UNPOOLED instead of DATABASE_URL
npm install
npm test
npm run dev
```

Open `/`, enter a Sleeper username, then use league toggle, year history, matchups, Weekly, Bracket, Download, and Sync.

Commissioner: `/login` → `/admin` with the Vercel `ADMIN_PASSWORD` or `ADMIN_PIN`. The five seed leagues stay as fallback.

## Sleeper chat upload

Monday cron generates PNGs. Automated posts to Sleeper league chat stay **off** until you explicitly approve sending messages. The `create_message` mutation against the unofficial `sleeper.com/graphql` API is implemented in `lib/sleeper-chat.ts`, gated behind `SLEEPER_CHAT_POST` — the code path exists but sends nothing until both env vars below are set.

To enable later (do not turn this on without approval):

1. Log in at sleeper.com → DevTools → Network → `graphql` → copy the `authorization` header JWT.
2. Set `SLEEPER_TOKEN` in Vercel env (never commit it).
3. Set `SLEEPER_CHAT_POST=1` only after approving live league-chat sends. This is the approval switch — the commissioner sets it deliberately, never an agent.
4. If the token is missing or expired, cron still finishes and Download on `/admin` remains the path into chat.
5. Posted messages link to `/api/og/{sleeperLeagueId}` (the live standings PNG) rather than attaching the image directly — the mutation only accepts message text, not an attachment.
