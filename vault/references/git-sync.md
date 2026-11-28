---
type: reference
purpose: "How to keep the vault in sync between the Pi repo and your laptop Obsidian"
project: hebrew-math-adventures
updated: 2026-08-03
tags: [reference, sync, git, obsidian, laptop]
---

# Keeping the Vault in Sync (laptop Obsidian ↔ Pi repo)

The vault is git-tracked **inside** the repo (`vault/`), so sync = git. No special tooling.

## The two "sources of truth" (they're the same file)
- **Repo on Pi:** `~/.openclaw/workspace/hebrew-math-adventures/vault/`
- **Laptop Obsidian:** open the same folder (or a clone) as a vault

Because it's plain Markdown + git, either side can be the editor and the other gets the change on next pull/push.

## Recommended laptop setup
1. Clone the repo (or just the branch you work on) to your laptop:
   `git clone https://github.com/Raamses/hebrew-math-adventures.git`
2. In Obsidian: **Open folder as vault** → point at `…/hebrew-math-adventures/vault`.
3. That's it — edit notes in Obsidian, then `git push` when done. The Pi pulls / I read the live version.

> Tip: don't point Obsidian at the whole repo root — just the `vault/` subfolder, so Obsidian doesn't index `node_modules`, `dist`, etc. (that's the bloat trap).

## Sync rhythm (keep it boring)
- **You edit on laptop** → push when you switch machines / finish a session.
- **I (AmosBot) update on the Pi** → commit with code changes, you pull to see them in Obsidian.
- **Conflicts are rare** (Markdown, one editor at a time); if one happens, git will flag it — resolve in the usual way.

## Pi checkout auto-sync (GA4 cron)
The daily `scripts/ga4-snapshot.sh` run rebases the Pi checkout's local snapshot commits onto `origin/main`, so the Pi stays current without a manual pull. It never touches a checked-out feature branch or non-snapshot commits. It skips those cases and logs why.

If `ga4-snapshot.log` shows `Sync FAILED`, the rebase was already aborted and HEAD restored, so nothing is lost. To finish by hand on the Pi:
1. `git fetch origin main && git rebase origin/main`
2. Resolve the conflict (usually two versions of the same day's snapshot), then `git add <file> && git rebase --continue`.
3. If anything goes wrong: `git rebase --abort`. The pre-sync HEAD from the last run is also at `refs/backup/ga4-pre-sync` (`git log -1 refs/backup/ga4-pre-sync`; it is overwritten by the next run).

Never `git reset --hard origin/main` on the Pi: it discards the local snapshot commits.

## Optional niceties (skip unless you want them)
- **Obsidian git plugin** (community): auto-commit+push on edit, so laptop↔Pi sync is hands-free. Install in Obsidian → Community Plugins → search "Obsidian Git".
- **Separate vault repo:** if you ever want the vault to move independently of code, it can be split to its own private repo — but for now it lives with the code, which is fine and simpler.

## Rule of thumb
> If you can see it in Obsidian and it's not in git, **push it**. If it's in git and not in Obsidian, **pull it**. Keep them within one commit of each other.
