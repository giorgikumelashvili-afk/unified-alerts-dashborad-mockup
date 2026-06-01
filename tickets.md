# Alerts Dashboard v1 — Sprint Tickets

Breakdown of **DEVOPS-17922 (Build Alerts Dashboard v1)** into 5 logically
separated tickets for a 2-week sprint. Epic: **DEVOPS-17858**. Design + mockup:
**DEVOPS-17921**.

**Shared tech baseline** (decided in DEVOPS-17921 — see `docs/stack-choice.md`):
C# / .NET 10 ASP.NET Core · **PostgreSQL** (Npgsql + EF Core; Dapper for hot reads)
· **Polly** for HTTP resilience · **Quartz via the central SchedulerService** for
scheduling · **OpenTelemetry** → Datadog (no Serilog) · React + TS + shadcn/ui for
the frontend · AWS EKS + Helm + Argo CD · internal IdentityServer auth + Tipalti
SSO · AWS Secrets Manager. All tech is internal or free for commercial use.

**Architecture in one line:** per-platform **collectors** (behind an `ICollector`
seam) → **discovery/normalization** → **PostgreSQL** (raw records + computed
`(team, PI)` aggregates) → **read API + CSV** → **React UI**, with a
**scheduler/backfill** driving ingestion. (Diagrams in `docs/architecture.md`.)

**Suggested sequencing:** T1 first (everyone unblocks on it) → T2 + T5 in parallel
→ T3 → T4. T5 (frontend) can start against the mockup's fake data and swap to the
real API as T4 lands.

---

## T1 — Foundation: service skeleton, PostgreSQL schema & config

**Goal:** stand up the deployable .NET service, the Postgres data model, and the
config layer that every other ticket builds on.

**In scope**
- .NET 10 ASP.NET Core service scaffolded to Tipalti convention (`service.json`,
  shared `Tipalti.*` NuGets, OpenTelemetry wired to Datadog, health endpoint).
- PostgreSQL schema via EF Core migrations (`*.Migrations` project): raw
  `alert_definition`, `firing_event`, `ack_event`; computed `team_pi_metric`.
  Schema holds **all** priorities (P1–P5) though v1 uses P1.
- Config layer (file or DB, editable without redeploy): **PI calendar**,
  **team-normalization map**, **per-platform priority conventions**, MTTA settings.
- EKS/Helm/Argo CD deploy via the shared `dotnet-publish.yml`; secrets through AWS
  Secrets Manager / External Secrets.

**Out of scope:** any real ingestion, metric computation, API, or UI.

**Architecture notes:** raw tables retain ≥ 2 PIs (12 weeks) so PIs recompute
without re-pull. Idempotent upserts use `INSERT ... ON CONFLICT` on
`(platform, source_id, event_ts)`.

**Acceptance**
- Service deploys to dev EKS, `/health` green, traces/logs visible in Datadog.
- `migrate` creates all tables; config loads and is re-readable without redeploy.

**Depends on:** none.

---

## T2 — Collectors & discovery/normalization

**Goal:** pull definitions / firings / acks from every platform and normalize them
to canonical team + priority, surfacing orphans.

**In scope**
- `ICollector` seam + one collector each for **Datadog, Prometheus, Coralogix,
  Pingdom, Opsgenie** (definitions, firings; acks for Opsgenie). Reuse
  `Tipalti.AlertProxyService`'s Opsgenie client + auth.
- **Polly** policies on every outbound call (retry/backoff, circuit breaker, honor
  429 / `Retry-After`).
- Discovery/normalization: `team_raw` → canonical key via the map; priority via
  per-platform conventions; **orphan** (unmapped team) and **Unknown** priority
  tagged, never dropped.
- **Dedup** rules: per-platform repeats collapsed; detection→Opsgenie mirror counted
  once with `reached_opsgenie = true`; Datadog vs Coralogix detections **kept
  separate** (see `docs/architecture.md §4`).

**Out of scope:** scheduling, aggregation, API, UI.

**Tech/arch notes:** collectors emit a normalized record shape only — storage/UI
never see platform payloads, so a 6th platform = one new collector.

**Acceptance**
- Each collector writes normalized raw rows for a manual date range.
- Orphans and Unknown priorities are persisted and queryable.
- A mirrored Datadog→Opsgenie alert produces one firing with `reached_opsgenie`.

**Depends on:** T1.

---

## T3 — Scheduling, backfill & metric aggregation

**Goal:** run ingestion automatically, backfill on demand, and compute the 5
metrics + all-teams aggregates per `(team, PI)`.

**In scope**
- Scheduled ingestion via the **central SchedulerService (Quartz)**: hourly
  firings/acks, daily definitions. Each run idempotent and self-reporting
  (success/failure → OpenTelemetry/Datadog).
- **On-demand backfill** per platform / team / date range, ≥ 12 weeks, resumable
  from a checkpoint (no duplicate rows).
- Aggregation job computing the 5 metrics — **Defined, Fired-Total,
  Fired-Opsgenie, Acknowledged, MTTA** — into `team_pi_metric`, plus all-teams
  **average / median / P90**. PIs recompute from raw without re-pull.

**Out of scope:** API surface, UI, business-hours MTTA (schema-ready only).

**Acceptance**
- Scheduled runs populate metrics within ~1h of source events; failures visible.
- Backfill of 12 weeks completes and is re-runnable without double counting.
- Recompute of a past PI reproduces identical numbers from stored raw records.

**Depends on:** T1, T2.

---

## T4 — Read API & CSV export

**Goal:** expose the stored metrics and raw records to the UI, and produce CSV
exports that match the UI exactly.

**In scope**
- Read endpoints: per-team series, all-teams comparison (avg/median/P90),
  drill-down to underlying alerts (with source deep-links), orphan list + trend,
  ingestion/job status, data-source health, config read.
- **CSV export** (FR-7): per-team series and all-teams aggregate (one row per
  `(PI, metric)`, columns per team + avg/median/P90), with the **PI calendar
  embedded**.
- Auth via internal IdentityServer; read-only; Tipalti SSO in front.

**Out of scope:** write-back of any kind; UI.

**Acceptance**
- Every endpoint returns data traceable to the raw records it was computed from.
- CSV reproduces the same numbers the API/UI show for the same PI + scope.

**Depends on:** T3.

---

## T5 — Frontend UI (React + TS + shadcn)

**Goal:** the v1 dashboard UI, wired to the read API.

**In scope** (promote the DEVOPS-17921 mockup in `mockup/` to a real app)
- Views: **Per-team** (5-metric trend, weekly/daily drill-down, routing-compliance
  ratio), **All-teams comparison** (avg/median/P90, red average line),
  **Orphan alerts** (+ PI-over-PI trend), **Ingestion & jobs**, **Export**, and a
  separate **Profile + Settings** account layout.
- shadcn/ui + Tailwind; dark/light toggle; **priority multi-select** (P1–P5);
  dates **dd-mm-yyyy**; deep-links back to source platforms.
- Replace fake data with API calls (React Query); SSO-gated, read-only.

**Out of scope:** P2–P5 surfacing beyond the selector, any write actions.

**Acceptance**
- Every team with ≥ 1 Opsgenie alert last PI shows all 5 metrics with clickable
  backing records; "how is team X trending PI-over-PI?" answerable without leaving
  the dashboard; routing-compliance and orphan counts visible per team.

**Depends on:** T4 for live data (can develop against the mockup's fake data first).
