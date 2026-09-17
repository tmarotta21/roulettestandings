---
name: git-pr
description: Branches, commits, and pull requests for this repo. Use when creating a branch, committing, pushing, or opening a PR.
---

# Git and PRs

Never commit, push, or merge to `main`. Branch from latest `main`. Squash-merge on GitHub only.

Do not commit or push unless the user asked. Do not create a PR unless the user asked.

## Branch

```bash
git checkout main
git pull
git checkout -b feat/short-slug
```

Prefixes: `feat/`, `fix/`, `chore/`. One independently reviewable outcome per branch.

## Commit

1. `git status`, `git diff`, `git log -8 --oneline` in parallel.
2. Stage named files or hunks only. No `git add -A` / `git add .`.
3. Do not commit `.env*`, secrets, credentials, or `node_modules`.
4. Message is 1–2 sentences on **why**, via HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
Why this change exists.

EOF
)"
```

No `--amend` unless the user asked, the commit succeeded (or a hook only rewrote files), you created HEAD, and it is unpushed. No `--no-verify`. No force-push to `main`. Force-push a feature branch only if the user asked and the branch is not shared.

## PR

Push with `-u` if the branch has no upstream. Open against `main`:

```bash
gh pr create --title "short why" --body "$(cat <<'EOF'
## Summary
- 

## Test plan
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test:unit`

EOF
)"
```

If asked to split work into multiple PRs, follow the split-to-prs skill: propose slices, wait for approval, never `git add -A`.
