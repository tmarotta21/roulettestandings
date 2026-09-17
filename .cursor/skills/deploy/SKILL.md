---
name: deploy
description: Production-safe Vercel deploys, env vars, crons, and Prisma migrations. Use when deploying, promoting, rolling back, changing vercel.ts, env, or migrate.
---

# Deploy

Production is the Vercel Git deploy of `main` after merge. PR pushes get preview URLs. Do not `vercel --prod`, `vercel promote`, or `vercel rollback` unless the user (repo admin) explicitly asked.

Never write Vercel env from an agent. Never commit secrets. Never set `SLEEPER_CHAT_POST`. Chat upload stays fail-closed — see `weekly-final`.

## Prisma

PRs may add migration files. Do not run `prisma migrate deploy` against production from a feature branch.

`vercel-build` / `npm run build` run `prisma generate && next build` only. They do **not** apply migrations. Schema does not apply itself on deploy; production `prisma migrate deploy` is an explicit owner step (`npm run db:migrate` with production `DATABASE_URL`).
