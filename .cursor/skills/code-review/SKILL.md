---
name: code-review
description: Review pull requests and diffs against repo scoring, Sleeper, test, and deploy rules. Use when reviewing a PR, branch, or code change.
---

# Code review

```bash
gh pr checkout <n>
gh pr diff <n>
```

Compare to `main`. Read `AGENTS.md` and the domain skills that match the diff (`sleeper`, `roulette-scoring`, `standings-image`, `weekly-final`).

## Blocking

- Scoring or Sleeper invariant breaks (WIN/TIE/ROU/PTS/PF, `playoff_week_start`, `/league/0`)
- Scoring or Sleeper client change without tests
- Secrets, `.env*`, or production credentials in the diff
- `SLEEPER_CHAT_POST` enabled or a test post to live league chat
- `vercel --prod` / promote / production migrate from a feature branch
- Direct commits or force-push to `main`

## Non-blocking

Style the linter would catch. Do not nitpick formatting CI already covers.

## Output

- **Critical** — must fix before merge
- **Suggestion** — consider
- **Nice-to-have** — optional

Do not merge unless the user is the repo admin, CI is green, and they asked to merge. Write-collaborator PRs need the owner’s review.

Run Bugbot or security-review only when the user asks.
