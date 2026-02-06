---
trigger: always_on
---

# Terminal Permissions & Performance

## Intent
To enable high-speed orchestration by allowing the agent to perform read-only discovery and testing tasks without manual confirmation.

## Allowed Commands (Auto-Execute)
The agent is authorized to execute the following command prefixes autonomously:

- **Navigation:** `ls`, `pwd`, `cat`, `grep`, `find`, `du`
- **Git (Read-only):** `git status`, `git log`, `git diff`, `git branch`, `git remote -v`
- **Environment:** `node -v`, `npm -v`, `python --version`, `pip list`, `env` (excluding secrets)
- **Testing:** `npm test`, `vitest`, `pytest`, `go test`

## Constraints
- **Destructive Commands:** Any command involving `rm`, `mv`, `sudo`, or `git push` **MUST** be proposed as an Artifact for review before execution.
- **Port Killing:** Commands like `kill` or `fuser` must request permission first.
- **Turbo Mode:** If the user has "Turbo" enabled in the Agent Manager, proceed with installation commands (`npm install`, `pip install`) only after updating the `Implementation Plan` artifact.
