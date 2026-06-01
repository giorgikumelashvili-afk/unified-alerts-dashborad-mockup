# Alerts Dashboard v1 — Sprint Tickets

Breakdown of **DEVOPS-17922 (Build Alerts Dashboard v1)** into 5 logically
separated tickets for a 2-week sprint. Epic: **DEVOPS-17858**. Design + mockup:
**DEVOPS-17921**.

**Shared tech baseline** (see `docs/stack-choice.md`): C# / .NET 10 ASP.NET Core ·
**PostgreSQL** (Npgsql + EF Core; Dapper for hot reads) · **Polly** for HTTP
resilience · ingestion via a **manual REST trigger** (no scheduler for the MVP) ·
**Coralogix** for telemetry + `Microsoft.Extensions.Logging` for local logs (no
Serilog) · React + TS + shadcn/ui for the frontend · AWS EKS + Helm + Argo CD ·
**Tipalti SSO** · AWS Secrets Manager. No cache. All tech is internal or free for
commercial use.

**Architecture in one line:** per-platform **collectors** (behind an `ICollector`
seam) → **PostgreSQL** (raw definitions, firings, acks) → **read API** that
computes metrics **in real time** (no stored aggregate) + CSV → **React UI**, with
ingestion driven by a **manual REST endpoint**. (Diagrams in `docs/architecture.md`.)

**Deferred for v1 (known limitations):** deduplication of mirrored alerts, and
team/priority discovery + normalization. Tracked separately; see `docs/risks.md`.

**Suggested sequencing:** T1 first (everyone unblocks on it) → T2 + T5 in parallel
→ T3 → T4. T5 (frontend) can start against the mockup's fake data and swap to the
real API as T4 lands.

---

## T1 — Foundation: service skeleton & PostgreSQL schema

**Goal:** stand up the deployable .NET service and the Postgres data model that
every other ticket builds on.

**In scope**
- .NET 10 ASP.NET Core service scaffolded to Tipalti convention (`service.json`,
  health endpoint), Coralogix telemetry + `Microsoft.Extensions.Logging`.
- PostgreSQL schema via EF Core migrations: raw `alert_definition` (incl.
  `created_at`), `firing_event`, `ack_event`. Schema holds all priorities (P1–P5)
  though v1 focuses on P1. No aggregate table — metrics are computed on read.
- Tipalti SSO in front; read-only.
- EKS/Helm/Argo CD deploy via the shared `dotnet-publish.yml`; secrets via AWS
  Secrets Manager / External Secrets.

**Out of scope:** ingestion, metric calc, API, UI.

**Acceptance**
- Service deploys to dev EKS, `/health` green, logs/telemetry visible in Coralogix.
- `migrate` creates the three raw tables; idempotent upsert key on
  `(platform, source_id, event_ts)` is in place.

**Depends on:** none.

---

## T2 — Per-platform collectors

**Goal:** pull definitions / firings / acks from every platform behind one seam.

**In scope**
- `ICollector` seam + one collector each for **Datadog, Prometheus, Coralogix,
  Pingdom, Opsgenie** (definitions, firings; acks for Opsgenie). Reuse
  `Tipalti.AlertProxyService`'s Opsgenie client + auth.
- **Polly** policies on every outbound call (retry/backoff, circuit breaker, honor
  429 / `Retry-After`).
- Collectors emit a normalized record shape only — storage/UI never see platform
  payloads, so a 6th platform is just a new collector.

**Out of scope:** scheduling, dedup, discovery/normalization, API, UI.

**Acceptance**
- Each collector writes normalized raw rows for a given date window.
- Transient API failures are retried via Polly without crashing the run.

**Depends on:** T1.

---

## T3 — Ingestion endpoint & backfill

**Goal:** run ingestion on demand, idempotently, including a 12-week backfill.

**In scope**
- A **manual REST ingest endpoint** (`POST /ingest`) parameterised by platform /
  team / date range that runs the relevant collectors and upserts raw rows.
- Idempotent + resumable: a re-run or interrupted backfill never duplicates rows.
- Backfill reaches ≥ 12 weeks (best-effort per platform retention).
- Record last-ingest timestamps for freshness visibility.

**Out of scope:** automatic scheduling (deferred), metric calc, UI.

**Acceptance**
- Calling the endpoint ingests the requested window; a second call is a no-op on
  already-stored rows.
- A 12-week backfill completes and is re-runnable without double counting.

**Depends on:** T1, T2.

---

## T4 — Read API & CSV export (real-time metrics)

**Goal:** compute the metrics from raw rows on read and serve them to the UI.

**In scope**
- Read endpoints computing **Fired-Total, Reached-Opsgenie, Acknowledged, MTTA**
  per team over a date range, plus **Defined** counts over time, the underlying
  firings/definitions (with source deep-links), and last-ingest timestamps.
- Metrics computed in real time over `firing_event` / `ack_event` /
  `alert_definition`; index for the common `(team, fired_at, priority)` access.
- **CSV export** for the per-team series and the defined-alerts list.
- Auth via Tipalti SSO; read-only.

**Out of scope:** stored aggregates, write-back.

**Acceptance**
- Endpoints return numbers traceable to the raw rows they were computed from.
- CSV reproduces the same numbers the UI shows for the same team + range.

**Depends on:** T3.

---

## T5 — Frontend UI (React + TS + shadcn)

**Goal:** the v1 dashboard UI, wired to the read API.

**In scope** (promote the DEVOPS-17921 mockup in `mockup/` to a real app)
- **Per-team** page: date-range calendar, priority multi-select (P1–P5), the three
  firing metric cards, a firings-over-time chart, a dedicated **MTTA vs acked**
  chart, the underlying firings table with source deep-links, and an Export button.
- **Defined alerts** page: definitions-over-time chart + table, with an Export button.
- **Profile** page (reached from the sidebar footer): SSO identity, read-only role.
- shadcn/ui + Tailwind; dark/light toggle; dates **dd-mm-yyyy**; SSO-gated.
- Replace fake data with API calls (React Query).

**Out of scope:** P2–P5 emphasis beyond the selector, any write actions.

**Acceptance**
- A team's firing/ack hygiene over a chosen range is answerable without leaving the
  dashboard; routing-compliance ratio visible; CSV export matches the UI.

**Depends on:** T4 for live data (can develop against the mockup's fake data first).
