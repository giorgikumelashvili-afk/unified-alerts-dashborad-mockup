# Alerts Dashboard — Tech Stack Choice (DEVOPS-17921)

> The stack for the **real** product (built in DEVOPS-17922). The fake-data
> mockup in this ticket is React + TS — see "C# vs JS" below.
>
> **Hard requirements set for this stack:** C# backend · **PostgreSQL** (no SQL
> Server) · **no Serilog** for telemetry · every technology must be **internal
> (Tipalti-operated) or free for private commercial use**.

## TL;DR

| Layer | Recommendation | Why |
|---|---|---|
| Backend / collectors | **C# / .NET 10 ASP.NET Core** | Tipalti's near-universal backend; reuses `Tipalti.AlertProxyService`'s Opsgenie client + auth |
| Storage (raw + agg) | **PostgreSQL** (required) | Hard requirement. Driver: **Npgsql**; data access: **EF Core** or **Dapper** |
| Cache (optional) | **In-memory** first; **Valkey** if a shared cache is needed | Avoids the Redis license question (see licensing) — dedup lives in Postgres anyway |
| Scheduling | **Central SchedulerService (Quartz-backed)** *or* **.NET `BackgroundService` + `PeriodicTimer`** | Decides *when* ingestion runs — see "Scheduling vs resilience" |
| HTTP resilience | **Polly** | Retries/backoff/circuit-breaker/rate-limit on each platform API call — see below |
| Telemetry / logging | **OpenTelemetry (.NET) + `Microsoft.Extensions.Logging`** → Datadog | **No Serilog.** OTel is the vendor-neutral standard; `ILogger` is built into .NET |
| UI | **React + TypeScript** (single-spa-ready), **shadcn/ui + Tailwind** | Matches Tipalti React convention; shadcn is copy-in components (no runtime lock-in) |
| Hosting / deploy | **AWS EKS + Helm + Argo CD**, Azure DevOps `dotnet-publish.yml` | Standard GitOps path; KEDA autoscaling |
| Auth | **Internal Tipalti IdentityServer** (client-credentials) + Tipalti SSO for the UI | Internal-operated → satisfies the licensing rule |
| Secrets | **AWS Secrets Manager** via K8s External Secrets (`Tipalti__Secret__*`) | No Vault, no secrets in repo |

## The "C# vs JS" question

Not competing — different layers. The **mockup here is React + TS** (a mockup is a
frontend artifact). The **real backend is C#/.NET**; the **real UI is React + TS**.

## Why C#/.NET for the backend

1. **Convention** — Tipalti business services are .NET 10 ASP.NET Core with shared
   `Tipalti.*` NuGets for auth/config/telemetry/bus.
2. **Concrete reuse** — `Tipalti.AlertProxyService` (`Monitoring` repo,
   `Microservices/CorrelationEngine/Tipalti.AlertProxyService`, .NET 8) already has
   `OpsgenieApiService.cs` (GenieKey auth, create/close), `OpsgenieTeamResolverService.cs`
   (team name→ID cache), and webhook auth filters — these port almost directly.
3. **Operational fit** — EKS/Helm/ArgoCD, internal IdentityServer, External Secrets,
   and Datadog telemetry are turnkey for a .NET service here.

## PostgreSQL (required)

SQL Server is **out**. Postgres is a first-class option at Tipalti (it's what the
central `SchedulerService` uses for its Quartz job store). Use **Npgsql** as the
ADO.NET driver, **EF Core** (migrations via a `*.Migrations` project, per
convention) or **Dapper** for hot read paths. The raw-records + computed-aggregates
model (see [architecture.md](architecture.md)) maps cleanly to Postgres; idempotent
upserts use `INSERT ... ON CONFLICT`.

## Telemetry — OpenTelemetry, not Serilog

- **Logging:** `Microsoft.Extensions.Logging` (`ILogger<T>`, built into .NET).
- **Traces + metrics + log export:** **OpenTelemetry .NET SDK**, OTLP-exported to
  **Datadog** (the internal observability backend) so the dashboard is observable
  like any Tipalti service: ingestion job success/failure, per-platform API error
  rates, and discovery warnings (orphans / unknown priorities).
- No Serilog anywhere.

## Scheduling vs resilience — Quartz and Polly do different jobs

This is the part worth being precise about, because they're often confused:

| | **Quartz.NET / SchedulerService** | **Polly** |
|---|---|---|
| Question it answers | *When* should the code run? | *How* does one API call survive failure? |
| Role | **Scheduler** — cron/cadence triggers, persistent schedules, misfire handling, clustering | **Resilience** — retry w/ exponential backoff, circuit breaker, timeout, rate-limiter |
| In this system | Fires the hourly firings/acks pull and the daily definitions pull; drives on-demand backfill | Wraps every outbound call to Datadog/Coralogix/Pingdom/Opsgenie so a 429/timeout/5xx is retried, not lost |
| Replaceable by the other? | **No** | **No** |

**They are complementary — you want both.** Polly is *not* a scheduler; it cannot
run something every hour. Quartz is *not* resilience; it won't retry a failed HTTP
call.

**Is Polly needed at all?** Yes — FR-6 requires the ingestion layer to own its
**rate-limiting and resumability**. That's exactly Polly's job: honor `Retry-After`
on 429s, back off on transient 5xx, and open a circuit when a platform is down so a
backfill pauses instead of hammering it. Without it you re-implement the same
retry/backoff logic by hand.

**Scheduling — pick one:**
- **A (recommended, convention): central SchedulerService (Quartz-backed)** — per
  ADR-0008 you *register* a job and it triggers your endpoint via HTTP/RabbitMQ. You
  may not run Quartz in-process at all; you get central scheduling, observability,
  and backfill orchestration for free.
- **B (simplest, zero extra dep): `BackgroundService` + `PeriodicTimer`** — both
  are in the .NET base library. A hosted service ticks hourly/daily and runs the
  pull. Trade-off: no central schedule registry, no clustering coordination, you own
  misfire/backfill logic yourself.

Start with **A** to match Tipalti; **B** is a fine fallback if you want no external
scheduler. Either way, **Polly** wraps the actual API calls.

## Licensing audit — everything is internal or free for private commercial use

| Technology | License | Commercial-OK? | Note |
|---|---|---|---|
| .NET 10 / ASP.NET Core / C# | MIT | ✅ | |
| **PostgreSQL** | PostgreSQL License (BSD-like) | ✅ | |
| Npgsql | PostgreSQL License | ✅ | PG ADO.NET driver |
| EF Core | MIT | ✅ | or **Dapper** (Apache-2.0) |
| **Quartz.NET** | Apache-2.0 | ✅ | only if running Quartz in-process |
| **Polly** | BSD-3-Clause | ✅ | |
| **OpenTelemetry .NET** | Apache-2.0 | ✅ | |
| `Microsoft.Extensions.Logging` | MIT | ✅ | |
| React / Vite / Tailwind | MIT | ✅ | |
| **shadcn/ui** | MIT | ✅ | components copied into repo — no runtime dependency lock-in |
| Radix UI / Recharts / lucide-react / clsx / tailwind-merge / CVA | MIT | ✅ | |
| RabbitMQ (if used) | MPL-2.0 | ✅ | only if triggering via the bus; MassTransit = Apache-2.0 |
| Tipalti IdentityServer | Internal | ✅ | Tipalti-operated → "internal use" |
| Datadog | Internal (SaaS, already licensed) | ✅ | observability backend |

**Two things flagged so we choose deliberately, not by accident:**
1. **Redis** — since Redis 7.4 the license is **RSALv2/SSPL** (not OSI-approved).
   Internal use is permitted, but to stay strictly "free for commercial use" the
   dashboard **doesn't require Redis**: dedup is done in Postgres (idempotent
   upserts), and any caching can be in-memory. If a shared cache is later needed,
   use **Valkey** (BSD-3, the Linux Foundation Redis fork) or Redis ≤ 7.2 (BSD-3).
2. **Duende IdentityServer** (the OSS-successor product) requires a **paid license**
   above a revenue threshold — so we do **not** adopt it. We use the **internal
   Tipalti IdentityServer**, which is already operated/licensed by Tipalti and counts
   as internal use.

## Open sub-decisions (story breakdown)

- EF Core vs Dapper (or both — EF for writes/migrations, Dapper for hot reads).
- Scheduling approach A vs B (above).
- Whether the UI ships as a standalone app or a single-spa micro-frontend in the AP
  Hub from day one.
