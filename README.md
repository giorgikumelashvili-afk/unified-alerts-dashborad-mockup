# Unified Alerts Dashboard — MVP design spike (DEVOPS-17921)

This repo holds the deliverables for **DEVOPS-17921 — "MVP for Alerts Dashboard"**,
the design spike under epic **DEVOPS-17858**. It is **not the product**: there are
no real collectors, no DB, no ingestion. The goal is to de-risk the build and pin
down the shape. The actual build is broken into sprint tickets in
[`tickets.md`](tickets.md).

## What's here

| Deliverable | Location |
|---|---|
| **UI mockup** (fake data) | [`mockup/`](mockup) — React + TS + Vite + shadcn/ui |
| **Architecture doc** (components, data flow, sequence diagram, data-model sketch) | [`docs/architecture.md`](docs/architecture.md) |
| **Stack-choice note** | [`docs/stack-choice.md`](docs/stack-choice.md) |
| **Risk list** | [`docs/risks.md`](docs/risks.md) |
| **Sprint tickets** (build breakdown of DEVOPS-17922) | [`tickets.md`](tickets.md) |

## The "C# vs JS" decision (short version)

**Both — at different layers, they don't compete.** The fake-data **mockup is
React + TS** (a mockup is a frontend artifact). The **real backend is C#/.NET** — it
matches Tipalti convention and reuses `Tipalti.AlertProxyService`'s Opsgenie client
+ auth. The **real UI** is React + TS. Full reasoning in
[`docs/stack-choice.md`](docs/stack-choice.md).

Stack decisions baked into the docs: **PostgreSQL required** (no SQL Server),
**Coralogix** for telemetry + `Microsoft.Extensions.Logging` for local logs (no
Serilog), **Polly** for HTTP resilience, ingestion via a **manual REST trigger**
(no scheduler for the MVP), metrics computed **in real time** (no stored
aggregate), **Tipalti SSO**, and every technology **internal or free for commercial
use**.

## Running the mockup

```bash
cd mockup
npm install
npm run dev      # opens http://localhost:5173
```

Built with **shadcn/ui + Tailwind**, a dark/light theme toggle, a date-range
calendar, and a multi-select priority filter (P1–P5, defaults to P1). Pages:

- **Per-team** — pick a team, date range and priorities; three firing metric cards
  (Fired, Reached Opsgenie, Acknowledged), a firings-over-time chart with the
  routing-compliance ratio, a dedicated **MTTA vs acknowledged** chart, and the
  underlying firings table with source deep-links. Has an Export CSV button.
- **Defined alerts** — a definitions-over-time chart + table of alert definitions.
  Has an Export CSV button.
- **Profile** — reached by clicking the user card at the bottom of the sidebar;
  SSO identity, read-only role.

Dates render **dd-mm-yyyy**.

```bash
npm run build    # type-checks and produces a production build
npm run lint     # eslint
npm run format   # prettier
```

## Scope reminder (from the ticket)

**In:** mockup, architecture sketch, stack choice, data-model sketch.
**Out:** real collectors, DB, ingestion; dedup and discovery/normalization
(deferred — see `docs/risks.md`).
