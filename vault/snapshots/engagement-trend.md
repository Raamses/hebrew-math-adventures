---
type: analysis
project: hebrew-math-adventures
created: 2026-08-14
updated: 2026-08-14
status: active
tags: [analytics, ga4, engagement, trend]
ga4_property: "519138010"
query_window: "28daysAgo → today"
---

# GA4 Engagement Time Trend — 28-Day Window

**Source:** GA4 Data API via `gog analytics report 519138010`
**Queried:** 2026-08-14 09:05 IDT
**Window:** 28daysAgo → today

## Daily Engagement

| Date | Active Users | Engagement Duration (s) | Engagement/User (s) |
|---|---|---|---|
| 2026-07-30 | 1 | 119 | 119.0 |
| 2026-07-31 | 128 | 3,189 | 24.9 |
| 2026-08-01 | 16 | 2,064 | 129.0 |
| 2026-08-06 | 14 | 260 | 18.6 |
| 2026-08-07 | 12 | 139 | 11.6 |
| 2026-08-11 | 66 | 1,122 | 17.0 |
| 2026-08-12 | 94 | 2,888 | 30.7 |
| 2026-08-13 | 87 | 2,593 | 29.8 |

## Key Observations

1. **Two distinct traffic waves:**
   - **Wave 1 (Jul 30–Aug 1):** Launch spike — 128 users on Jul 31, high engagement per user (25s avg). Long-tail on Aug 1 with 16 users but very high engagement (129s/user — likely testers/early adopters).
   - **Wave 2 (Aug 11–13):** Sustained growth — 66→94→87 users over 3 days, consistent engagement (17–31s/user). This looks like organic return traffic + word-of-mouth.

2. **Gap period (Aug 2–10):** Very low traffic (0–14 users/day). App may have had a deploy issue, broken link, or simply lost momentum after the initial launch push.

3. **Engagement per user is healthy:** 25–31s in the high-traffic days. For a children's math game, this is meaningful engagement (each question takes ~5–10s, so 3–6 questions per session).

4. **Trend direction:** The Aug 11–13 wave shows **growing engagement** (1,122→2,888→2,593s) with stable user counts. The slight dip on Aug 13 vs Aug 12 is within normal variance.

## Recommendations

- **Investigate the Aug 2–10 gap:** Check if there was a deploy issue, broken share link, or if the app was offline. The drop from 128 users to 14 in 5 days is suspicious.
- **Track weekly cohorts:** With only 8 data points in 28 days, daily trends are noisy. Weekly cohort analysis would be more reliable.
- **Set up automated alerting:** If daily active users drop below 20 for 3+ consecutive days, alert — this would have caught the Aug 2–10 gap early.

## How to re-run

```bash
gog analytics report 519138010 \
  --from=28daysAgo --to=today \
  --dimensions=date \
  --metrics=userEngagementDuration,activeUsers \
  --max=30 --plain
```