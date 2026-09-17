# Phase 2 local test (before commit / push)

Do this on the uncommitted working tree. Do not commit, push, or open a GitHub PR until the UI on **http://localhost:3000** matches what you want.

Production [roulettestandings.vercel.app](https://roulettestandings.vercel.app) is still Phase 1. Local is the only place Phase 2 exists.

## Start

`.env.local` is already present (`DATABASE_URL`, `ADMIN_PIN`). Leave `SLEEPER_CHAT_POST` unset. Do not post to Sleeper chat.

```bash
npm test
npm run dev
```

Open **http://localhost:3000**. First standings / admin loads can take 10–20s (Sleeper + optional Neon sync).

If `/` jumps straight into a user’s standings, you already have the username cookie. Use **http://localhost:3000/?change=1** to re-enter a username.

## Public UI

Use a username in the hosted 2026 leagues (example: `rotorooster`).

1. **Landing** — Sleeper username form. Bad username → error. Unknown-to-hosted user → “none of your leagues are hosted.” Good user → `/u/{username}`.
2. **Standings** — one league table: Team, WIN, ROU, PTS, PF. Playoff rows highlighted (count = Sleeper `playoff_teams`). Your username bold if it matches.
3. **League toggle** — only *that user’s* hosted leagues (up to the five seeds plus any admin extras). Switching league changes the table and matchups.
4. **Year** — dropdown from `previous_league_id`. 2025 Shadynasty should show a completed regular season (through week 14), not week 1 of 2026.
5. **Matchups** — under the table, paired by `matchup_id`, with live-ish points.
6. **Weekly tab** — week chips for regular season, recap W/L/T + pts, matchup cards. History years should default to the last completed regular-season week.
7. **Bracket tab** — Sleeper winners bracket (TBD / empty is OK if playoffs are not generated yet; 2025 Shadynasty should show rounds).
8. **Download** — saves a **square** PNG (`WIN` / `ROU` / `PTS` / `PF`), filename like `{slug}-{season}-w{week}.png`. Not preview-only.
9. **Sync** — button shows Syncing, then refreshes. Scores should not error. Cooldown may no-op if you click twice in 15s.
10. **Nav** — Roulette / Standings / Weekly / Bracket / Admin. Username in the header → `/?change=1`.

Also click **Weekly** and **Bracket** in the top nav (they redirect using the cookie).

## Commissioner UI

1. **http://localhost:3000/login** — PIN from `ADMIN_PIN` in `.env.local`. Lands on `/admin`.
2. **Hosted list** — five seed leagues, marked seed, **no Remove**.
3. **Add** — garbage ID (e.g. `not-a-league`) → Sleeper 404, list unchanged.
4. **Add/remove a real extra league** only if you want that ID in Neon. Seed IDs cannot be removed. Prefer not adding 2025 Shadynasty as a sixth hosted league unless you mean to.
5. **Sync** and per-league **Download** still work on `/admin`.
6. **Sleeper chat** card should say post is **off** / waiting on approval. Cron must not send chat messages during this test.

## Fail if

- Live Vercel still looks like this (it will, until a later push).
- `/`, `/weekly`, `/bracket`, `/u/…` still show “Phase 2: copy tournamentleagues…”.
- `/` is PIN-only with no username gate.
- Scoring columns include PPG / W-L, or rank is not PTS then PF.
- Download is preview-only or not square.
- Chat messages appear in any Sleeper league.

## After you approve the UI

Tell the agent to commit, push a feature branch (not `main`), and open the PR. Draft:

**Title:** Add public username standings, admin league registry, and live Sync

**Body:**

```
## Summary
- Public username gate cookies a Sleeper username and shows roulette standings only for hosted leagues that user plays in (toggle, year history, matchups, weekly + bracket tabs, PNG download, Sync).
- PIN `/admin` can add/remove extra Sleeper league IDs in Neon; the five seed IDs stay as fallback. Commissioner dashboard + Download moved here.
- Monday cron still generates PNGs. Sleeper chat upload stays fail-closed until commissioner approval (`SLEEPER_CHAT_POST` + `SLEEPER_TOKEN`).

## Test plan
- [ ] Local: username → standings → league toggle → year → matchups → Weekly → Bracket → Download PNG → Sync
- [ ] Local: `/login` → `/admin` add invalid ID (error); seed leagues not removable; Download + Sync
- [ ] Preview URL after this PR: same path as local (production is still Phase 1 until merge)
- [ ] `npm test` including live WIN/PF reconcile
- [ ] No Sleeper chat posts
```
