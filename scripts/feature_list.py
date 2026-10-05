#!/usr/bin/env python3
"""Generate feature_list.json — the roadmap status mirror for hebrew-math-adventures.

Source of truth = the vault, in this order:
  vault/roadmap/current-work.md    -> "Completed"/"Recently landed" sections, "In flight/next"
  vault/roadmap/backlog.md         -> bullet items, marked backlog or known-issue
  vault/roadmap/known-issues.md    -> bullet items, status known_issue
  vault/architecture/feature-inventory.md -> feature inventory (id/title)

Never hand-edit the output. Regenerate in the same commit that changes roadmap state:
    python3 scripts/feature_list.py

Evidence discipline: an item is only "done" if its entry carries an
"Evidence:" line. No evidence = not done (see vault/roadmap/current-work.md).
"""
from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROADMAP = ROOT / "vault/roadmap"
OUT = ROOT / "feature_list.json"


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True,
                          check=False).stdout.strip()


def section(text: str, name: str) -> str:
    """Return the body of a '## name' markdown section."""
    m = re.search(rf"^##\s+{re.escape(name)}\s*$(.*?)(?=^##\s|\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def bullets(body: str) -> list[str]:
    """Top-level bullets, each carrying its nested `  - ...` continuation lines.

    The continuation matters: evidence lives on an indented child line, so a flat
    per-line match would drop it and mark real work unverified.
    """
    items: list[str] = []
    cur: list[str] = []
    for line in body.split("\n"):
        m = re.match(r"^[-*]\s+(.+)$", line)
        if m:
            if cur:
                items.append("\n".join(cur))
            cur = [m.group(1).strip()]
        elif cur and re.match(r"^\s{2,}[-*]\s+", line):
            cur.append(re.sub(r"^\s+[-*]\s+", "", line).strip())
        elif cur and line.strip() == "":
            continue
        elif cur:
            cur.append(line.strip())
    if cur:
        items.append("\n".join(cur))
    # collapse intra-line spacing but KEEP the newline between a bullet and its
    # continuation lines, so split_entry() can still tell them apart
    return ["\n".join(re.sub(r"[ \t]+", " ", ln).strip() for ln in b.split("\n")).strip()
            for b in items]


def split_entry(item: str) -> tuple[str, str | None, str | None]:
    """'`sha` — title' on line 1, optional Evidence:/⚠️ lines after it.

    Returns (commit_or_None, title, evidence_or_warning_or_None).
    """
    lines = [ln for ln in item.split("\n") if ln.strip()]
    head = lines[0] if lines else ""
    ev = warn = None
    for ln in lines[1:]:
        ln = re.sub(r"\*\*", "", ln.strip())
        if ln.startswith("Evidence:"):
            ev = ln[len("Evidence:"):].strip()
        elif "⚠️" in ln:
            warn = ln
    m = re.match(r"`?([0-9a-f]{7,40})`?\s*(?:—|-|–|:)\s*(.+)", head)
    if m:
        return m.group(1), m.group(2).strip(), ev or warn
    return None, head, ev or warn


def main() -> int:
    current = (ROADMAP / "current-work.md").read_text(encoding="utf-8")
    backlog = (ROADMAP / "backlog.md").read_text(encoding="utf-8")
    issues = (ROADMAP / "known-issues.md").read_text(encoding="utf-8")

    features: list[dict] = []

    # 1. landed / completed — evidence-gated
    done_body = section(current, "Recently landed (on main)") + section(current, "Completed (since Aug 8)")
    for b in bullets(done_body):
        sha, title, ev = split_entry(b)
        if not sha:
            continue
        # An entry is only done if its evidence positively claims a passing run.
        # A ⚠️ trailer on ANY line downgrades it, even when a clean Evidence: line
        # also exists (e.g. `0aeaddf`: has evidence, but flagged "NOT re-verified").
        hedges = ("⚠️", "missing", "no green", "not re-verified", "not independently",
                  "not evidence-complete", "predates this commit", "⚠")
        blob = " ".join(ln for ln in b.split("\n")).lower()
        complete = bool(ev) and not any(h in blob for h in hedges)
        features.append({
            "id": f"hma-{sha[:7]}",
            "title": title,
            "status": "done" if complete else "unverified",
            "commit": sha,
            "evidence": ev,
            "source": "vault/roadmap/current-work.md",
        })

    # 2. in flight / next
    for b in bullets(section(current, "In flight / next")):
        features.append({
            "id": "hma-inflight-" + re.sub(r"[^a-z0-9]+", "-", b.lower())[:40].strip("-"),
            "title": b,
            "status": "in_progress",
            "evidence": None,
            "source": "vault/roadmap/current-work.md#in-flight--next",
        })

    # 3. backlog
    for b in bullets(section(backlog, "Technical debt / refactoring")) + bullets(section(backlog, "Feature gaps")):
        features.append({
            "id": "hma-backlog-" + re.sub(r"[^a-z0-9]+", "-", b.lower())[:40].strip("-"),
            "title": b,
            "status": "backlog",
            "evidence": None,
            "source": "vault/roadmap/backlog.md",
        })

    # 4. known issues
    for b in bullets(section(issues, "Active issues")):
        features.append({
            "id": "hma-issue-" + re.sub(r"[^a-z0-9]+", "-", b.lower())[:40].strip("-"),
            "title": b,
            "status": "known_issue",
            "evidence": None,
            "source": "vault/roadmap/known-issues.md",
        })

    counts: dict[str, int] = {}
    for f in features:
        counts[f["status"]] = counts.get(f["status"], 0) + 1

    state = {
        "schema": "hma.feature-list.v1",
        "generated_by": "scripts/feature_list.py",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repo": "Raamses/hebrew-math-adventures",
        "commit": git("rev-parse", "--short", "HEAD"),
        "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
        "authority": {
            "vault": "vault/",
            "index": "vault/INDEX.md",
            "roadmap": "vault/roadmap/current-work.md",
        },
        "done_definition": {
            "command": "./init.sh",
            "rule": "evidence = command + result + date recorded in the repo; prose 'done' is invalid",
            "baseline_note": (
                "Known pre-existing red on main: 524 eslint errors + 1 failing unit test "
                "(src/lib/__tests__/worldConfig.test.ts). init.sh gates on regression above "
                "that baseline, not absolute zero."
            ),
        },
        "counts": dict(sorted(counts.items())),
        "features": features,
    }
    OUT.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(features)} features, {state['counts']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())