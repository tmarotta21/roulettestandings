# Contributing

Goal: run the app on your laptop, make edits, then open a pull request so it can be reviewed before anything hits the live site. Do not commit or push to `main`; GitHub will block that.

You need Git and Node.js (LTS). Then run these in order.

## 1) Get the code

```bash
git clone https://github.com/tmarotta21/roulettestandings.git
cd roulettestandings
```

If you already cloned, `cd` into that folder instead.

## 2) Install and start it locally

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor. Set `ADMIN_PASSWORD` to any dummy password you invent (for `/login` on your laptop). Leave `DATABASE_URL`, `CRON_SECRET`, `SLEEPER_TOKEN`, and `SLEEPER_CHAT_POST` alone — do not paste production secrets.

```bash
npm install
npm run dev
```

Open http://localhost:3000 in a browser. Stop the server with Ctrl+C when you are done.

## 3) Before you edit, start a branch from latest main

Never edit on `main`.

```bash
git checkout main
git pull
git checkout -b feat/short-description
```

Examples: `feat/fix-typo` or `fix/login-button`. Do your work on that branch.

## 4) When you are ready for review

```bash
npm run test:unit

git add path/to/the/files/you/changed
git status
git commit -m "Why you made this change."
git push -u origin HEAD
```

Then open the repo on GitHub. You should see a **Compare & pull request** button. Target branch must be `main`. Add a short summary and how you tested it (even “ran npm run dev and clicked X”). Do not merge it — ping for review.

If Cursor or Claude Code is helping: open this folder as the project. Follow `AGENTS.md` and the skills in `.cursor/skills/`.

If anything errors, send the command you ran and the output. Do not force-push, do not push to `main`, and do not commit `.env.local`.
