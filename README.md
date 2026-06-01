# Unified Alerts Dashboard — MVP design spike (DEVOPS-17921)

This repo holds the deliverables for **DEVOPS-17921 — "MVP for Alerts Dashboard"**,
the design spike under epic **DEVOPS-17858**. It is **not the product**: there are
no real collectors, no DB, no ingestion, and no real UI. The goal is to de-risk the
build and pin down the shape.

## What's here

| Deliverable | Location |
|---|---|
| **UI mockup** (fake data, 3 v1 views) | [`mockup/`](mockup) — React + TS + Vite |
| **Architecture doc** (components, data flow, sequence diagram, schema + config + data-model sketch) | [`docs/architecture.md`](docs/architecture.md) |
| **Stack-choice note** (+ alternatives) | [`docs/stack-choice.md`](docs/stack-choice.md) |
| **Risk list** (rate limits, retention, volume) | [`docs/risks.md`](docs/risks.md) |

## The "C# vs JS" decision (short version)

**Both — at different layers, they don't compete.** The fake-data **mockup is
React + TS** (a mockup is a frontend artifact). The **real backend recommended for
later is C#/.NET** — it matches Tipalti convention and reuses
`Tipalti.AlertProxyService`'s Opsgenie client + auth. The **real UI later** is
React + TS. Full reasoning in [`docs/stack-choice.md`](docs/stack-choice.md).

Stack constraints baked into the docs: **PostgreSQL required** (no SQL Server),
**OpenTelemetry** for telemetry (no Serilog), **Polly** for HTTP resilience +
**Quartz/SchedulerService** for scheduling (they solve different problems — see the
stack note), and every technology is **internal or free for private commercial
use** (licensing table in the stack note).

## Running the mockup

```bash
cd mockup
npm install
npm run dev      # opens http://localhost:5173
```

Built with **shadcn/ui + Tailwind**, dark/light theme toggle, and a multi-select
priority filter (P1–P5, defaults to P1). Pages (all under a "MOCKUP — FAKE DATA"
banner):

- **Per-team** — the 5 metrics as a trend across PIs; click a point to drill into
  weekly/daily sub-buckets + the underlying alerts; routing-compliance ratio.
- **All-teams comparison** — pick a metric + PI; bars per team with a red
  average line, plus average/median/P90 cards (FR-4).
- **Orphan alerts** — undiscoverable team/priority alerts + the PI-over-PI orphan
  trend (drops as teams fix tagging).
- **Ingestion & jobs** — per-platform source health, on-demand backfill controls,
  and recent scheduled-run history (FR-1, FR-6, observability).
- **Export** — builds a real CSV from the fake data; per-team or all-teams
  aggregate, optional embedded PI calendar (FR-7).
- **Profile** and **Settings** — a separate account layout (SSO/read-only profile;
  PI calendar, team-normalization map, priority conventions, MTTA config).

Dates render **dd-mm-yyyy**. The mockup demonstrates the v1 functionality from
**DEVOPS-17922** (the build story) as if final — UI only, no backend.

```bash
npm run build    # type-checks and produces a production build
```

## Scope reminder (from the ticket)

**In:** mockup, architecture sketch, stack choice, config shape, data-model sketch.
**Out:** real collectors, DB, ingestion, real UI; priority-convention standardization.
