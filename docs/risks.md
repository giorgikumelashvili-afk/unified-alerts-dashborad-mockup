# Alerts Dashboard — Risk List (MVP / DEVOPS-17921)

> What could bite the real build. Numbers below are **rough order-of-magnitude
> estimates for sizing**, to be confirmed against live API docs/quotas during
> story breakdown — not verified figures.

## 1. Per-platform API rate limits

Ingestion is read-only polling, but backfill (≥2 PIs / 12 weeks) is bursty. Each
collector must own its rate-limiting + resumability so an interrupted backfill
resumes without duplicates (RAW upserts are idempotent on `(platform, source_id,
event_ts)`).

| Platform | Rate-limit risk | Mitigation |
|---|---|---|
| **Datadog** | Per-endpoint quotas; monitor-search + events can be chatty | Page with cursors, respect `X-RateLimit-*` headers, hourly cadence |
| **Opsgenie** | Per-integration throttling on the Alerts API + activity log | Backoff on 429, batch by time window |
| **Coralogix** | Query/API quotas vary by plan | Window queries, reuse existing AlertProxy auth patterns |
| **Pingdom** | Lower ceilings; smaller account | Few checks → low volume, daily is fine |
| **Prometheus/Alertmanager** | Firing *history* often not retained | Mirror via Coralogix if needed (see below) |

## 2. API retention vs the 12-week backfill requirement

The epic requires backfill reaching **≥ 2 PIs (12 weeks)**. The hard risk: some
platforms don't retain event history that far.

| Platform | Retention risk | Note |
|---|---|---|
| **Prometheus/Alertmanager** | **Highest** — firing history typically short-lived / not durable | Plan to source Prom firing history from the **Coralogix mirror**, not Prom itself |
| **Datadog** | Monitor state-change event history window may be < 12 weeks on plan | Confirm event retention; may cap backfill depth |
| **Coralogix** | Alert-event retention tied to plan tier | Verify the mirror covers Prom-origin alerts for the full window |
| **Pingdom** | Incident history generally adequate | Lower risk |
| **Opsgenie** | Alert + activity-log retention usually sufficient for 12wk | Confirm activity-log window for MTTA |

**Consequence:** backfill depth is "best-effort subject to each platform's
retention" (per epic). Surface actual reachable depth per platform in the UI so
gaps aren't mistaken for "zero alerts".

## 3. Deduplication of mirrored alerts

Dedup has **two cases** (see [architecture.md §4](architecture.md)) and the risk is
conflating them:

- **Per-platform dedup** — within one platform, collapse repeats by
  `(platform, source_id, fire_window)`.
- **Detection → Opsgenie mirror** — a Datadog/Coralogix alert mirrored into
  Opsgenie is the *same firing*: count once for `P1-Fired-Total`, set
  `reached_opsgenie = true`.
- **Cross-detection — keep both** — if Datadog **and** Coralogix each independently
  detect a similar condition, store **both**; they're separate definitions. We do
  **not** cross-dedup detection platforms.

**Risk:** the `dedupe_key` must be scoped to the *detection platform* so it never
merges Datadog with Coralogix, while still collapsing the Opsgenie mirror via a
`mirror_of` link. Alert identity differs across platforms (Opsgenie alias vs Datadog
monitor id) — getting the mirror pairing wrong skews the headline metric and the
routing-compliance ratio. Needs explicit per-platform id-mapping rules and a test
corpus.

## 4. MTTA business-hours ambiguity

`P1-MTTA` default is all wall-clock hours; a business-hours-only variant is
schema-ready (`mtta_business_seconds`) but the **business-hours definition is
undecided** (per-team timezones? follow-the-sun? holidays?). Risk of comparing
teams on inconsistent clocks. Keep all-wall-clock as the v1 surfaced metric;
treat business-hours as a later, explicitly-specified variant.

## 5. Discovery / orphan risk

Team attribution + priority are discovered from platform metadata, which is
**inconsistent by design** (that's why the epic exists). Risk: high orphan / many
`Unknown` priorities at launch make early numbers look sparse. Mitigation: orphan
+ unknown-priority counts are first-class UI (not dropped), and the normalization
map is editable without redeploy so SRE iterates without code changes.

## 6. Rough daily event volume (sizing estimate)

Ballpark to size storage/ingestion — **confirm against real data**:

- Alert **definitions**: hundreds–low thousands total across platforms; pulled
  **daily**, so ~10²–10³ rows/day churn. Negligible.
- Alert **firings**: the variable cost. Estimate ~**1k–10k firing events/day**
  org-wide across all priorities (P1 is a small fraction). Pulled hourly.
- **Ack** events: bounded by Opsgenie alert volume, ~same order as firings that
  reach Opsgenie.

→ RAW growth ≈ low-millions of rows per year — comfortably within **PostgreSQL**.
The 12-week raw-retention window keeps the hot set small;
older raw can be archived since aggregates are already computed. **Risk is low**;
the real driver to confirm is peak firing burst rate (incident storms), which
stresses ingestion rate-limiting more than storage.

## 7. Secondary risks

- **Auth/secret sprawl** — five platform credentials. Mitigate via AWS Secrets
  Manager + External Secrets (`Tipalti__Secret__*`), no secrets in repo.
- **Recompute correctness** — aggregates must exactly match the UI/CSV for a PI
  (success criterion #2). Needs a golden-dataset test.
- **PI-boundary edges** — firings near a PI start/end must land in exactly one PI;
  the configurable calendar must be the single source of truth for bucketing.
