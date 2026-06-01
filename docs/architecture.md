# Alerts Dashboard — Architecture Sketch (DEVOPS-17921)

> Design spike. Nothing here is built (that's DEVOPS-17922). This documents the
> *intended* shape so the build starts with the seams in the right places. The
> only thing coded in this ticket is the fake-data UI mockup in [`/mockup`](../mockup).

## 1. What it must do

Per `(team, PI)`, surface five P1 metrics — **P1-Defined, P1-Fired-Total,
P1-Fired-Opsgenie, P1-Acknowledged, P1-MTTA** — across Datadog, Prometheus,
Coralogix, Pingdom and Opsgenie, plus all-teams aggregates, an orphan-alerts view,
scheduled ingestion + backfill, and CSV export. A **PI** is a configurable 6-week
window.

Two constraints drive the design:
1. **Add a platform without touching storage or UI** → a per-platform collector seam.
2. **Recompute a PI without re-pulling from sources** → keep raw records, compute on top.

## 2. Components

```mermaid
flowchart LR
  subgraph Collectors["Per-platform collectors (ICollector seam)"]
    DD[Datadog]
    PR[Prometheus]
    CX[Coralogix]
    PD[Pingdom]
    OG[Opsgenie]
  end
  Collectors -->|normalized records| Norm[Discovery & normalization]
  Norm --> Store[(PostgreSQL\nraw + aggregates)]
  Sched[Scheduler / backfill] --> Collectors
  Store --> API[Read API + CSV export]
  API --> UI[React UI]
  Store -. metrics/logs .-> OTel[OpenTelemetry → Datadog]
```

**The seam:** `ICollector` returns a **normalized record shape** (§5). Discovery,
storage and UI never see platform-specific payloads → a 6th platform is one new
collector, nothing downstream changes.

```csharp
// The contract, not the implementation.
public interface ICollector {
    string Platform { get; }                       // "datadog", "opsgenie", ...
    Task<IReadOnlyList<RawAlertDefinition>> GetDefinitionsAsync(DateRange w, CancellationToken ct);
    Task<IReadOnlyList<RawFiringEvent>>     GetFiringsAsync(DateRange w, CancellationToken ct);
    Task<IReadOnlyList<RawAckEvent>>        GetAcksAsync(DateRange w, CancellationToken ct); // Opsgenie v1
}
```

## 3. Ingestion sequence

```mermaid
sequenceDiagram
    participant Sch as Scheduler
    participant Col as DatadogCollector
    participant DD as Datadog API
    participant Norm as Normalization
    participant Store as PostgreSQL
    Sch->>Col: run(window = last hour)
    Col->>DD: GET monitors + state-change events
    DD-->>Col: monitors[], events[]
    Note over Col,DD: Polly wraps the call (retry/backoff, honor 429)
    Col-->>Norm: normalized RawFiringEvent[]
    Norm->>Norm: team_raw → canonical key · discover priority · tag orphans
    Norm->>Store: upsert raw (idempotent on platform+source_id+ts)
    Store->>Store: recompute team_pi_metric for affected (team, PI)
    Sch-->>Sch: record run success/failure (OTel → Datadog)
```

Idempotency: raw upserts key on `(platform, source_id, event_ts)` so a re-run or
resumed backfill never double-counts. Aggregates are derived → safe to recompute
any time.

## 4. Deduplication logic

The rule has two distinct cases — getting this wrong skews `P1-Fired-Total` and the
routing-compliance ratio:

```mermaid
flowchart TD
  E[Incoming firing event] --> Q1{Same source_id + fire-window\nfrom the SAME platform?}
  Q1 -- yes --> D1[Duplicate → collapse\nper-platform dedup]
  Q1 -- no --> Q2{Is the source Opsgenie,\nmirroring a detection alert?}
  Q2 -- yes --> D2[Same firing → count once,\nset reached_opsgenie = true]
  Q2 -- no --> D3[Independent detection → STORE BOTH\nDatadog and Coralogix kept separate]
```

- **Per-platform dedup (case 1):** within one platform (e.g. Datadog re-notifying
  the same monitor), collapse repeats by `(platform, source_id, fire_window)`.
- **Detection → Opsgenie mirror (case 2):** Opsgenie is the *routing/notification*
  layer. A Datadog/Coralogix alert mirrored into Opsgenie is the **same firing** —
  count it **once** for `P1-Fired-Total` and set `reached_opsgenie = true` (this is
  what the compliance ratio measures).
- **Cross-detection — keep both (case 3):** if Datadog **and** Coralogix each
  independently detect a "similar" condition, they are **separate alert
  definitions** on separate platforms → **store both**, do **not** cross-dedup.
  We only collapse the trivial same-alert-mirrored-to-Opsgenie case.

The `dedupe_key` therefore scopes to *detection platform* (so it never merges
Datadog with Coralogix) and a `mirror_of` link records the detection→Opsgenie pairing.

## 5. Discovery & normalization

```mermaid
flowchart LR
  R[Raw record\nteam_raw + platform priority] --> T{team_raw in\nnormalization map?}
  T -- yes --> TC[team_canonical set]
  T -- no --> ORPH[team_canonical = null\n→ orphan]
  TC --> P{priority discoverable\nper convention?}
  ORPH --> P
  P -- yes --> PR[priority = P1..P5]
  P -- no --> UNK[priority = Unknown\n→ warning]
  PR --> OUT[(store)]
  UNK --> OUT
```

Team identity and priority are discovered from each platform's own metadata (no
central manual catalog). Unrecognized teams → **orphans**; undiscoverable priority →
**Unknown**. Both are surfaced in the UI, never dropped, so teams fix tagging at the
source — and the normalization map is editable without redeploy.

## 6. Data model

```mermaid
erDiagram
  ALERT_DEFINITION ||--o{ FIRING_EVENT : "fires"
  FIRING_EVENT ||--o| ACK_EVENT : "acked in Opsgenie"
  FIRING_EVENT }o--|| TEAM_PI_METRIC : "rolls up to"
  ALERT_DEFINITION {
    string platform
    string source_id
    string source_url
    string team_raw
    string team_canonical "null = orphan"
    string priority "P1..P5 | Unknown"
  }
  FIRING_EVENT {
    string platform "detection platform"
    string source_id
    string team_canonical
    string priority
    datetime fired_at
    bool reached_opsgenie
    string dedupe_key "scoped to detection platform"
    string mirror_of "→ opsgenie alert, nullable"
  }
  ACK_EVENT {
    string opsgenie_alert_id
    datetime created_at
    datetime acknowledged_at "null = auto-closed"
    string ack_by
  }
  TEAM_PI_METRIC {
    string team
    string pi_id
    int p1_defined
    int p1_fired_total
    int p1_fired_opsgenie
    int p1_acked
    int mtta_seconds
    int mtta_business_seconds
  }
```

- **Raw** (`alert_definition`, `firing_event`, `ack_event`) retained **≥ 2 PIs / 12
  weeks** so PIs recompute without re-pull. Schema holds **all** priorities though
  v1 UI shows P1 (P2–P5 non-breaking later).
- **Computed** `team_pi_metric` is one row per `(team, PI)`. All-teams
  **average / median / P90** per metric per PI are computed from it (median/P90
  stored even though v1 UI surfaces the average).

## 7. Config shape (structure only — editable without redeploy)

```jsonc
{
  "piCalendar": [ { "id": "PI-2026-1", "startDate": "2026-01-05" } ],     // 6-week windows
  "teamNormalization": {                                                  // platform label → canonical key
    "datadog":   { "<monitor team tag>": "<canonicalKey>" },
    "opsgenie":  { "<opsgenie team name>": "<canonicalKey>" }
  },
  "priorityConventions": {                                                // how each platform encodes priority
    "datadog":   { "tagKey": "priority", "fallbackField": "priority" },
    "coralogix": { "severityField": "severity" },
    "pingdom":   { "default": "P1", "overrideTag": "priority" },
    "opsgenie":  { "field": "priority" }
  },
  "mtta": { "businessHoursOnly": false, "timezone": "UTC" }               // FR-3 MTTA variant
}
```

## 8. Non-functionals

- **Freshness:** stable within 1h (hourly firing pulls + cheap aggregate recompute).
- **Auditability:** every aggregate traces to the raw rows it came from.
- **Observability:** ingestion run success/failure, per-platform API error rates,
  and discovery warnings emit via **OpenTelemetry → Datadog**.
- **Access:** internal-only via Tipalti SSO, read-only in v1.

See [`stack-choice.md`](stack-choice.md) for the runtime and [`risks.md`](risks.md)
for rate-limit / retention / volume risks.
