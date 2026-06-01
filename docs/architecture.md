# Alerts Dashboard — Architecture Sketch (DEVOPS-17921)

> Design spike. Nothing here is built (that's DEVOPS-17922). This documents the
> intended shape so the build starts with the seams in the right places. The only
> thing coded in this ticket is the fake-data UI mockup in [`/mockup`](../mockup).

## 1. What it must do

Surface, per team, the alert metrics — **Fired-Total, Fired-Opsgenie,
Acknowledged, MTTA** and **Defined** — across Datadog, Prometheus, Coralogix,
Pingdom and Opsgenie. For the MVP, metrics are computed **in real time** from the
stored raw records (no precomputed aggregate table).

Two constraints drive the design:
1. Add a platform without touching storage or UI -> a per-platform collector seam.
2. Keep the raw records so any window can be recomputed without re-pulling.

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
  Trigger[Manual ingest REST endpoint] --> Collectors
  Collectors -->|raw records| Store[(PostgreSQL\nraw: definitions, firings, acks)]
  Store --> API[Read API\nreal-time metric calc + CSV]
  API --> UI[React UI]
  Store -. logs/telemetry .-> CX2[Coralogix]
```

<!-- **The seam:** `ICollector` returns a normalized record shape (section 4). Storage -->
<!-- and UI never see platform-specific payloads, so a 6th platform is one new collector -->
<!-- and nothing downstream changes. -->

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

Ingestion is triggered manually via a REST endpoint for the MVP (no scheduler).

```mermaid
sequenceDiagram
    participant User as Operator / REST call
    participant Ing as IngestController
    participant Col as Collector (per platform)
    participant Ext as Platform API
    participant Store as PostgreSQL
    User->>Ing: POST /ingest?platform=all&from=..&to=..
    loop Datadog, Prometheus, Coralogix, Pingdom, Opsgenie
        Ing->>Col: run(window)
        Col->>Ext: GET definitions / firings / acks
        Ext-->>Col: payloads
        Note over Col,Ext: Polly wraps the call (retry/backoff, honor 429)
        Col-->>Store: upsert raw (idempotent on platform + source_id + ts)
    end
    Ing-->>User: summary (records ingested)
```

Ingestion fans out to **all five collectors** by default (`platform=all`); pass a
single platform to ingest just one. Idempotency: raw upserts key on
`(platform, source_id, event_ts)` so a re-run never double-counts. Metrics are
computed on read, so there is no aggregate to rebuild.

## 4. Data model

Three raw tables. Metrics are calculated in real time from them — there is **no**
stored `(team, PI)` aggregate table in the MVP.

```mermaid
erDiagram
  ALERT_DEFINITION ||--o{ FIRING_EVENT : "fires"
  FIRING_EVENT ||--o| ACK_EVENT : "acked in Opsgenie"
  ALERT_DEFINITION {
    string platform
    string source_id
    string source_url
    string team
    string priority "P1..P5 | Unknown"
    datetime created_at "when the definition was created on the platform"
    datetime captured_at "when we read it"
  }
  FIRING_EVENT {
    string platform
    string source_id
    string source_url
    string alert_def_source_id "links to the definition"
    string team
    string priority
    datetime fired_at
    bool reached_opsgenie
  }
  ACK_EVENT {
    string opsgenie_alert_id
    string source_id
    string source_url
    datetime created_at "Opsgenie createdAt"
    datetime acknowledged_at "null = auto-closed"
    string ack_by "null if none"
  }
```

- **Raw** (`alert_definition`, `firing_event`, `ack_event`) retained for the full
  query window so any range can be recomputed without re-pull. Schema holds **all**
  priorities though v1 UI focuses on P1 (P2-P5 non-breaking later).
- **Metrics** (Fired-Total, Fired-Opsgenie, Acknowledged, MTTA, Defined) are
  computed by the read API directly over these rows per team and date range.

See [`stack-choice.md`](stack-choice.md) for the runtime and [`risks.md`](risks.md)
for rate-limit / retention / volume / real-time-calc risks.
