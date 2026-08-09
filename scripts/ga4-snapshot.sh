#!/usr/bin/env bash
#
# ga4-snapshot.sh — Daily GA4 analytics snapshot for Hebrew Math Adventures
#
# Queries the GA4 Data API via gog CLI and writes a dated Markdown snapshot
# to vault/snapshots/. Designed to run daily via cron.
#
# Usage:
#   ./scripts/ga4-snapshot.sh          # today vs yesterday
#   ./scripts/ga4-snapshot.sh 7        # last 7 days
#
# Cron example (daily at 09:00 Asia/Jerusalem):
#   0 9 * * * /home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-snapshot.sh >> /home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-snapshot.log 2>&1
#
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROPERTY_ID="519138010"
REPO_DIR="/home/ramamos/.openclaw/workspace/hebrew-math-adventures"
SNAPSHOT_DIR="${REPO_DIR}/vault/snapshots"
GOG_BIN="${GOG_BIN:-gog}"

# Lookback window (default: 1 day ago → today)
LOOKBACK_DAYS="${1:-1}"
FROM_DATE="${FROM_DATE:-${LOOKBACK_DAYS}daysAgo}"
TO_DATE="${TO_DATE:-today}"

# ── Helpers ──────────────────────────────────────────────────────────────────
TODAY=$(date '+%Y-%m-%d')
NOW=$(date '+%Y-%m-%d %H:%M %Z')
SNAPSHOT_FILE="${SNAPSHOT_DIR}/ga4-${TODAY}.md"

mkdir -p "${SNAPSHOT_DIR}"

echo "[$NOW] GA4 snapshot starting — property ${PROPERTY_ID}, window ${FROM_DATE} → ${TO_DATE}"

# ── Query 1: Daily overview (date dimension) ─────────────────────────────────
echo "[$NOW] Querying daily overview..."
DAILY=$("${GOG_BIN}" analytics report "${PROPERTY_ID}" \
  --from="${FROM_DATE}" --to="${TO_DATE}" \
  --dimensions=date \
  --metrics=activeUsers,sessions,eventCount,userEngagementDuration \
  --max=50 --plain 2>&1) || DAILY="# Query failed"

# ── Query 2: Event breakdown (eventName dimension) ───────────────────────────
echo "[$NOW] Querying event breakdown..."
EVENTS=$("${GOG_BIN}" analytics report "${PROPERTY_ID}" \
  --from="${FROM_DATE}" --to="${TO_DATE}" \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=100 --plain 2>&1) || EVENTS="# Query failed"

# ── Query 3: Event by date (date + eventName) ───────────────────────────────
echo "[$NOW] Querying event-by-date breakdown..."
EVENTS_BY_DATE=$("${GOG_BIN}" analytics report "${PROPERTY_ID}" \
  --from="${FROM_DATE}" --to="${TO_DATE}" \
  --dimensions=date,eventName \
  --metrics=eventCount,activeUsers \
  --max=250 --plain 2>&1) || EVENTS_BY_DATE="# Query failed"

# ── Query 4: 28-day funnel (for trend context) ──────────────────────────────
echo "[$NOW] Querying 28-day funnel..."
FUNNEL=$("${GOG_BIN}" analytics report "${PROPERTY_ID}" \
  --from="28daysAgo" --to="today" \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=100 --plain 2>&1) || FUNNEL="# Query failed"

# ── Build Markdown ─────────────────────────────────────────────────────────
{
  cat << EOF
---
type: snapshot
project: hebrew-math-adventures
created: ${TODAY}
updated: ${TODAY}
status: active
tags: [snapshot, analytics, ga4, daily]
ga4_property: "${PROPERTY_ID}"
query_window: "${FROM_DATE} → ${TO_DATE}"
---

# GA4 Daily Snapshot — ${TODAY}

**Source:** GA4 Data API via \`gog analytics report ${PROPERTY_ID}\`
**Queried:** ${NOW}
**Window:** ${FROM_DATE} → ${TO_DATE}

## Daily Overview

| Date | Active Users | Sessions | Events | Engagement Duration (s) |
|---|---|---|---|---|
EOF

  # Parse daily overview TSV
  if [[ "${DAILY}" != "# Query failed" ]]; then
    echo "${DAILY}" | tail -n +2 | while IFS=$'\t' read -r date users sessions events eng; do
      # Format date from 20260806 to 2026-08-06
      fmt_date="${date:0:4}-${date:4:2}-${date:6:2}"
      echo "| ${fmt_date} | ${users} | ${sessions} | ${events} | ${eng} |"
    done
  else
    echo "| (query failed) | — | — | — | — |"
  fi

  cat << EOF

## Event Breakdown (window)

| Event | Count | Active Users |
|---|---|---|
EOF

  if [[ "${EVENTS}" != "# Query failed" ]]; then
    echo "${EVENTS}" | tail -n +2 | while IFS=$'\t' read -r event count users; do
      echo "| \`${event}\` | ${count} | ${users} |"
    done
  else
    echo "| (query failed) | — | — |"
  fi

  cat << EOF

## Events by Date

| Date | Event | Count | Active Users |
|---|---|---|---|
EOF

  if [[ "${EVENTS_BY_DATE}" != "# Query failed" ]]; then
    echo "${EVENTS_BY_DATE}" | tail -n +2 | while IFS=$'\t' read -r date event count users; do
      fmt_date="${date:0:4}-${date:4:2}-${date:6:2}"
      echo "| ${fmt_date} | \`${event}\` | ${count} | ${users} |"
    done
  else
    echo "| (query failed) | — | — | — |"
  fi

  cat << EOF

## 28-Day Funnel (trend context)

| Event | Count | Active Users |
|---|---|---|
EOF

  if [[ "${FUNNEL}" != "# Query failed" ]]; then
    echo "${FUNNEL}" | tail -n +2 | while IFS=$'\t' read -r event count users; do
      echo "| \`${event}\` | ${count} | ${users} |"
    done
  else
    echo "| (query failed) | — | — |"
  fi

  cat << EOF

## Key Metrics

EOF

  # Calculate key ratios from the 28-day funnel
  if [[ "${FUNNEL}" != "# Query failed" ]]; then
    # Extract counts for key events
    app_open_count=$(echo "${FUNNEL}" | grep -E '^app_open\b' | awk -F'\t' '{print $2}')
    node_start_count=$(echo "${FUNNEL}" | grep -E '^node_start\b' | awk -F'\t' '{print $2}')
    node_complete_count=$(echo "${FUNNEL}" | grep -E '^node_complete\b' | awk -F'\t' '{print $2}')
    question_answered_count=$(echo "${FUNNEL}" | grep -E '^question_answered\b' | awk -F'\t' '{print $2}')

    app_open_users=$(echo "${FUNNEL}" | grep -E '^app_open\b' | awk -F'\t' '{print $3}')
    node_start_users=$(echo "${FUNNEL}" | grep -E '^node_start\b' | awk -F'\t' '{print $3}')
    node_complete_users=$(echo "${FUNNEL}" | grep -E '^node_complete\b' | awk -F'\t' '{print $3}')
    question_answered_users=$(echo "${FUNNEL}" | grep -E '^question_answered\b' | awk -F'\t' '{print $3}')

    # Calculate ratios (guard against zero)
    if [[ -n "${node_start_count:-}" && "${node_start_count}" -gt 0 ]]; then
      complete_ratio=$(echo "scale=1; ${node_complete_count:-0} * 100 / ${node_start_count}" | bc 2>/dev/null || echo "—")
      qa_ratio=$(echo "scale=1; ${question_answered_count:-0} * 100 / ${node_start_count}" | bc 2>/dev/null || echo "—")
    else
      complete_ratio="—"
      qa_ratio="—"
    fi

    cat << EOF
| Metric | Value | Target |
|---|---|---|
| 28-day active users | ${app_open_users:-—} | — |
| node_complete / node_start ratio | ${complete_ratio}% | >70% |
| question_answered / node_start ratio | ${qa_ratio}% | >90% |
| Total questions answered (28d) | ${question_answered_count:-—} | growing |
| Total node completions (28d) | ${node_complete_count:-—} | growing |
EOF
  else
    echo "| (funnel query failed — metrics not computed) |"
  fi

  cat << EOF

## How to re-run

\`\`\`bash
# Full snapshot (default: 1-day window)
./scripts/ga4-snapshot.sh

# Custom window
./scripts/ga4-snapshot.sh 7   # last 7 days
\`\`\`

Generated by \`scripts/ga4-snapshot.sh\` — automated daily via cron at 09:00 GMT+3.
EOF

} > "${SNAPSHOT_FILE}"

echo "[$NOW] Snapshot written: ${SNAPSHOT_FILE}"

# ── Git commit (if repo is clean enough) ─────────────────────────────────────
cd "${REPO_DIR}"
if git rev-parse --git-dir >/dev/null 2>&1; then
  git add "${SNAPSHOT_FILE}" 2>/dev/null || true
  # Only commit if there are staged changes and no other dirty files
  if git diff --cached --quiet 2>/dev/null; then
    echo "[$NOW] No changes to commit."
  else
    # Check if ONLY the snapshot is staged (don't commit unrelated changes)
    STAGED_COUNT=$(git diff --cached --name-only | wc -l)
    if [[ "${STAGED_COUNT}" -eq 1 ]]; then
      git commit -m "chore(analytics): daily GA4 snapshot ${TODAY}" --no-verify 2>/dev/null \
        && echo "[$NOW] Committed snapshot to git." \
        || echo "[$NOW] Git commit failed (non-fatal)."
    else
      echo "[$NOW] Skipping git commit — unrelated files staged."
    fi
  fi
fi

echo "[$NOW] GA4 snapshot complete."
