# Alerts Dashboard — Tech Stack Choice (DEVOPS-17921)

The stack for the real product (built in DEVOPS-17922). The fake-data mockup in
this ticket is React plus TypeScript. Hard requirements: C# backend, PostgreSQL,
Coralogix for telemetry, every technology internal or free for commercial use.

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Backend | C# / .NET 10 ASP.NET Core | Tipalti convention; reuses AlertProxyService's Opsgenie client |
| Storage | PostgreSQL (Npgsql plus EF Core, Dapper for hot reads) | Required; raw records, metrics computed in real time |
| Scheduling | Manual REST trigger endpoint (ingest, compute, persist on demand) | Simplest path to ship the MVP; no Quartz |
| HTTP resilience | Polly | Retry, backoff and honor 429 on platform API calls |
| Telemetry | Coralogix | Single observability backend |
| Logging | Microsoft.Extensions.Logging (local, provider-based like winston) | Built in to .NET, no Serilog |
| UI | React plus TypeScript plus shadcn/ui | Matches Tipalti React convention |
| Hosting | AWS EKS plus Helm plus Argo CD | Standard GitOps path |
| Auth | Tipalti SSO | Internal sign-in only |
| Secrets | AWS Secrets Manager via External Secrets | No secrets in repo |

## Summary

A small internal .NET 10 service over PostgreSQL: per-platform collectors pull raw
definitions, firings and acks; ingestion runs on demand through a REST endpoint
(no scheduler for the MVP); Polly makes the outbound platform calls resilient; the
read API computes the metrics in real time and serves the React plus shadcn UI.
Telemetry and logs go to Coralogix, auth is Tipalti SSO, and it deploys on the
standard EKS plus Helm plus Argo CD path. Every dependency is internal or free for
commercial use.
