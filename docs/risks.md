# Alerts Dashboard — Risk List (DEVOPS-17921)

> Numbers below are rough order-of-magnitude estimates for sizing, to be confirmed
> against live API docs/quotas during the build — not verified figures. Updated for
> the MVP decisions: manual ingestion trigger, real-time metric calculation, no
> cache, Coralogix-only telemetry, and dedup/discovery deferred.

## 1. Per-platform API rate limits

Ingestion is read-only polling, but a 12-week backfill is bursty. Each collector
owns its own rate-limiting and resumability via **Polly** (honor 429 / `Retry-After`,
back off on 5xx). Raw upserts are idempotent on `(platform, source_id, event_ts)`,
so a re-run never double-counts.

| Platform | Rate-limit risk | Mitigation |
|---|---|---|
| Datadog | Per-endpoint quotas; monitor-search + events can be chatty | Page with cursors, respect rate-limit headers |
| Opsgenie | Per-integration throttling on Alerts API + activity log | Backoff on 429, batch by time window |
| Coralogix | Query/API quotas vary by plan | Window queries |
| Pingdom | Lower ceilings, small account | Few checks, low volume |
| Prometheus/Alertmanager | Firing history often not retained | Source from Coralogix mirror |

## 2. API retention vs the 12-week backfill

| Platform | Retention risk | Note |
|---|---|---|
| Prometheus/Alertmanager | Highest — firing history short-lived | Source Prom firing history from the Coralogix mirror |
| Datadog | Event history window may be < 12 weeks on plan | Confirm; may cap backfill depth |
| Coralogix | Alert-event retention tied to plan tier | Verify the mirror covers the full window |
| Pingdom | Incident history generally adequate | Lower risk |
| Opsgenie | Alert + activity-log retention usually sufficient | Confirm activity-log window for MTTA |

Reachable backfill depth is best-effort per platform. Surface it in the UI so gaps
are not mistaken for "zero alerts".

## 3. Real-time metric calculation (MVP decision)

There is no precomputed aggregate table — every read recomputes metrics from raw
rows. **Risk:** queries slow down as raw data grows, especially wide date ranges
across all teams. **Mitigation:** index `firing_event` on `(team, fired_at, priority)`
and `ack_event` on `(opsgenie_alert_id, created_at)`; cap default ranges; if it
becomes hot, add a materialized aggregate later (the raw retention makes that a
non-breaking change).

## 4. Manual ingestion trigger (MVP decision)

Ingestion runs only when the REST endpoint is called — there is no scheduler.
**Risk:** data freshness depends on someone (or an external cron) calling it; stale
data is easy to ship unnoticed. **Mitigation:** record last-ingest timestamps and
show them in the UI; add a scheduled trigger (cron / SchedulerService) post-MVP.

## 5. Deferred deduplication

Dedup is not implemented yet. **Risk:** an alert mirrored Datadog/Coralogix ->
Opsgenie can be counted more than once in Fired-Total, and the routing-compliance
ratio can be skewed. **Mitigation:** document it as a known limitation for v1; add
dedup (per-platform plus detection-to-Opsgenie mirror) when the identity-mapping
rules are defined.

## 6. Deferred discovery / normalization

Team attribution and priority are taken from each platform as-is, without a
normalization map. **Risk:** the same team labeled differently across platforms
fragments its numbers, and undiscoverable team/priority values are not yet
surfaced as orphans. **Mitigation:** treat as a known v1 gap; add the normalization
layer and an orphan view next.

## 7. MTTA definition

MTTA is wall-clock only for the MVP (`acknowledged_at - created_at`). A
business-hours variant and per-team timezones are out of scope until requirements
are pinned down.

## 8. Rough daily event volume (sizing estimate)

- Definitions: hundreds to low thousands total, pulled on demand — negligible churn.
- Firings: the variable cost — estimate ~1k-10k events/day org-wide (P1 a small
  fraction).
- Acks: bounded by Opsgenie alert volume.

RAW growth is roughly low-millions of rows per year — comfortably within PostgreSQL.
Peak firing burst rate (incident storms) stresses ingestion rate-limiting more than
storage.

## 9. Single telemetry backend

Telemetry and logs go only to Coralogix. **Risk:** if Coralogix ingestion is down,
the dashboard is blind to its own ingestion failures. **Mitigation:** keep local
`Microsoft.Extensions.Logging` output (stdout) as a fallback visible in pod logs.
