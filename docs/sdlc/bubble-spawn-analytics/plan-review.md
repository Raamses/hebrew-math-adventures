# Analytics Plan Review & Additional Work

> **Date**: 2026-08-08
> **Reviewer**: AmosBot + agy (Gemini 3.1 Pro)
> **Related**: `docs/sdlc/bubble-spawn-analytics/0-plan.md`, `vault/domain/analytics.md`

---

## What's already done

1. **GA4 property identified and verified**: property ID 519138010, measurement ID G-17ZV4RGH0L
2. **APIs enabled**: both `analyticsdata.googleapis.com` and `analyticsadmin.googleapis.com` on both the Firebase project and gog's OAuth project
3. **Real data retrieved**: 28-day window, 16 event types, 565 question_answered events, 50 active users
4. **Funnel analysis**: identified 94% node-start → node-complete drop-off as the key playability concern
5. **Playability metrics defined**: 4 target metrics with current values and goals
6. **Vault documentation written**: `vault/domain/analytics.md` with full event taxonomy and real data

## What's missing — additional work needed

### Tier 1: Must-do (blocks playability validation)

1. **Register GA4 custom dimensions** — event params like `profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group` exist in the code but are NOT registered as custom dimensions in GA4 Admin. Without registration, they can't be used as queryable dimensions in reports. Need to:
   - Register each custom parameter in GA4 Admin (via `gog analytics admin` or REST API)
   - Wait for data propagation (can take 24-48h)
   - Test querying via `gog analytics report 519138010 --dimensions=customParameter:profile_id`

2. **Per-node completion rate** — query `node_complete` grouped by `node_id` to find which specific nodes have the worst completion rates. This directly tells us which nodes need attention. Blocked by #1 (custom dimension registration).

3. **Per-user engagement** — query `question_answered` filtered by `profile_id` to identify power users vs at-risk users (who start but don't finish). Blocked by #1.

### Tier 2: Should-do (improves playability understanding)

4. **Engagement time trend** — query `averageEngagementTimePerSession` by date to detect declining engagement. Available now (no custom dimensions needed).

5. **Bubble game vs other modes comparison** — compare `question_answered` counts and completion rates between `mode=bubble` and `mode=practice` sessions. The `mode` param is already emitted on `question_answered` events. Need custom dimension registration.

6. **Response time distribution** — query `response_time_ms` (available on `question_answered` events) to detect questions that take too long (possible bubble-spawn issues) or are too fast (possible guessing). Need custom dimension registration.

### Tier 3: Nice-to-have (deep analysis)

7. **Automated daily/weekly GA4 snapshot** — cron job that queries GA4 and writes a summary to `docs/sdlc/analytics-snapshots/YYYY-MM-DD.md`. Would give trend data over time without manual queries.

8. **Playability dashboard** — a simple script or Notion page that shows the 4 key playability metrics with trend arrows. Would make it easy to check playability at a glance.

9. **Correlate GA4 data with code changes** — cross-reference GA4 metrics with git commits to see which changes moved the needle. Requires #7 (snapshots) first.

## Recommended next steps

1. **Immediate**: Register the 5 key custom dimensions in GA4 Admin (`profile_id`, `node_id`, `equation`, `response_time_ms`, `mode`)
2. **After 24-48h**: Run the per-node completion rate query
3. **This week**: Run the engagement time trend query (available now)
4. **Create a card**: "Analytics: Register GA4 custom dimensions" for the board
5. **Create a card**: "Analytics: Per-node completion rate analysis" (blocked by the above)

## How to register GA4 custom dimensions

```bash
# Via gog analytics admin (if supported) or REST API
# Need to register each custom parameter as a dimension in GA4 Admin
# The Analytics Admin API endpoint:
# POST https://analyticsadmin.googleapis.com/v1beta/properties/519138010/customDimensions
# Body: { "parameterName": "profile_id", "displayName": "Profile ID", "scope": "EVENT" }
```