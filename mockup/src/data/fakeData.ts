// Deterministic fake data (no Math.random) so the mockup renders identically
// every load. MOCKUP ONLY — none of this comes from a real platform.

import type {
  DataSourceStatus,
  DrillDownAlert,
  Granularity,
  IngestionJob,
  MetricKey,
  MetricMeta,
  OrphanAlert,
  Platform,
  Priority,
  ProgramIncrement,
  TeamPiMetrics,
} from "../types";

export const TEAMS = ["vulcan", "argus", "dbops", "atlas", "hermes"] as const;
export type Team = (typeof TEAMS)[number];

export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4", "P5"];
/** Epic v1 scope is P1; UI defaults here. */
export const DEFAULT_PRIORITIES: Priority[] = ["P1"];

export const PIS: ProgramIncrement[] = [
  { id: "PI-2025-3", label: "PI 2025-3", startDate: "2025-10-06" },
  { id: "PI-2025-4", label: "PI 2025-4", startDate: "2025-11-17" },
  { id: "PI-2026-1", label: "PI 2026-1", startDate: "2026-01-05" },
  { id: "PI-2026-2", label: "PI 2026-2", startDate: "2026-02-16" },
];

export const METRICS: MetricMeta[] = [
  { key: "defined", label: "Defined", hint: "Distinct alert definitions owned at PI-end" },
  { key: "firedTotal", label: "Fired (Total)", hint: "Firings in the PI, deduped per detection platform" },
  { key: "firedOpsgenie", label: "Fired → Opsgenie", hint: "Subset that reached Opsgenie (routing compliance)" },
  { key: "acked", label: "Acknowledged", hint: "Explicitly acked by a human in Opsgenie" },
  { key: "mttaMinutes", label: "MTTA (min)", hint: "Mean time to acknowledge, wall-clock", lowerIsBetter: true, unit: "min" },
];

export const METRIC_BY_KEY: Record<MetricKey, MetricMeta> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<MetricKey, MetricMeta>;

export const COUNT_METRIC_KEYS: MetricKey[] = ["defined", "firedTotal", "firedOpsgenie", "acked"];

// --- deterministic pseudo-values --------------------------------------------
function seed(team: string, piIndex: number, salt: number): number {
  let h = salt;
  for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) % 9973;
  return (h + piIndex * 17) % 9973;
}
const between = (n: number, lo: number, hi: number) => lo + (n % (hi - lo + 1));

const PRIORITY_SALT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, Unknown: 9 };
// Higher priorities are rarer → scale counts down for P2..P5.
const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 1.6, P3: 2.4, P4: 1.2, P5: 0.6, Unknown: 0 };

/** Per (team, PI, priority) base metrics. */
function basePriorityMetrics(team: string, piIndex: number, p: Priority): TeamPiMetrics {
  const s = (salt: number) => seed(team, piIndex, salt + PRIORITY_SALT[p] * 50);
  const w = PRIORITY_WEIGHT[p];
  const defined = Math.round(between(s(3), 6, 22) * w);
  const firedTotal = Math.round(between(s(7), 4, 40) * w);
  const compliance = Math.min(1, 0.55 + piIndex * 0.1 + (s(9) % 15) / 100);
  const firedOpsgenie = Math.round(firedTotal * compliance);
  const acked = Math.min(firedOpsgenie, Math.round(firedOpsgenie * (0.6 + (s(11) % 35) / 100)));
  const mtta = Math.max(3, between(s(13), 8, 45) - piIndex * 3);
  return { team, piId: PIS[piIndex].id, defined, firedTotal, firedOpsgenie, acked, mttaMinutes: mtta };
}

/** Aggregate the selected priorities into a single (team, PI) row. */
export function teamPiMetrics(team: string, piId: string, priorities: Priority[]): TeamPiMetrics {
  const piIndex = Math.max(0, PIS.findIndex((p) => p.id === piId));
  const sel = priorities.length ? priorities : DEFAULT_PRIORITIES;
  const rows = sel.map((p) => basePriorityMetrics(team, piIndex, p));
  const sum = (k: keyof TeamPiMetrics) => rows.reduce((a, r) => a + (r[k] as number), 0);
  // MTTA = mean weighted by acked volume (fallback simple mean).
  const ackTotal = sum("acked");
  const mtta = ackTotal
    ? Math.round(rows.reduce((a, r) => a + r.mttaMinutes * r.acked, 0) / ackTotal)
    : Math.round(rows.reduce((a, r) => a + r.mttaMinutes, 0) / rows.length);
  return {
    team,
    piId,
    defined: sum("defined"),
    firedTotal: sum("firedTotal"),
    firedOpsgenie: sum("firedOpsgenie"),
    acked: ackTotal,
    mttaMinutes: mtta,
  };
}

export function seriesForTeam(team: string, priorities: Priority[]): TeamPiMetrics[] {
  return PIS.map((pi) => teamPiMetrics(team, pi.id, priorities));
}

export function metricsForPi(piId: string, priorities: Priority[]): TeamPiMetrics[] {
  return TEAMS.map((t) => teamPiMetrics(t, piId, priorities));
}

// --- aggregations across teams (FR-4): average / median / P90 ---------------
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? Math.round((sorted[base] + rest * (sorted[base + 1] - sorted[base])) * 10) / 10
    : sorted[base];
}

export interface Aggregate {
  average: number;
  median: number;
  p90: number;
}

export function aggregateForPi(piId: string, key: MetricKey, priorities: Priority[]): Aggregate {
  const vals = metricsForPi(piId, priorities)
    .map((r) => r[key] as number)
    .sort((a, b) => a - b);
  const average = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return { average, median: quantile(vals, 0.5), p90: quantile(vals, 0.9) };
}

// --- sub-PI drill-down (weekly / daily) -------------------------------------
export interface SubBucket {
  label: string; // dd-mm or week label
  iso: string;
  value: number;
}

/** Break a PI metric down into weekly (6) or daily (~42) buckets. */
export function subBuckets(
  team: string,
  piId: string,
  priorities: Priority[],
  granularity: Granularity,
  key: MetricKey,
): SubBucket[] {
  const piIndex = Math.max(0, PIS.findIndex((p) => p.id === piId));
  const total = teamPiMetrics(team, piId, priorities)[key] as number;
  const start = new Date(PIS[piIndex].startDate).getTime();
  const buckets = granularity === "weekly" ? 6 : 42;
  const stepMs = granularity === "weekly" ? 7 * 864e5 : 864e5;
  const isMtta = key === "mttaMinutes";

  // Distribute the PI total across buckets with a stable, varied shape.
  const weights = Array.from({ length: buckets }, (_, i) => 1 + (seed(team, piIndex, 60 + i) % 5));
  const wSum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, i) => {
    const d = new Date(start + i * stepMs);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const value = isMtta
      ? Math.max(2, total + (w - 3) * 2) // MTTA wobbles around the mean
      : Math.round((total * w) / wSum);
    return {
      label: granularity === "weekly" ? `W${i + 1}` : `${dd}-${mm}`,
      iso: d.toISOString(),
      value,
    };
  });
}

// --- drill-down fake alerts --------------------------------------------------
const PLATFORMS: Platform[] = ["datadog", "coralogix", "pingdom", "prometheus", "opsgenie"];
const ALERT_NAMES = [
  "HighErrorRate-checkout", "DBReplicaLag", "QueueDepthCritical", "5xx-spike-gateway",
  "DiskPressure-node", "CertExpiry", "LatencyP99-payments", "MemoryLeak-worker",
  "KafkaConsumerLag", "RedisEvictions",
];

export function drillDownAlerts(team: string, piId: string, priorities: Priority[]): DrillDownAlert[] {
  const piIndex = Math.max(0, PIS.findIndex((p) => p.id === piId));
  const total = teamPiMetrics(team, piId, priorities).firedTotal;
  const count = Math.min(total, 10);
  const start = new Date(PIS[piIndex].startDate).getTime();
  const sel = priorities.length ? priorities : DEFAULT_PRIORITIES;
  return Array.from({ length: count }, (_, i) => {
    const platform = PLATFORMS[(i + piIndex) % PLATFORMS.length];
    const reachedOpsgenie = (seed(team, piIndex, 20 + i) % 10) > 2;
    return {
      sourceId: `${platform}-${team}-${i}`,
      platform,
      name: `${ALERT_NAMES[(i + piIndex) % ALERT_NAMES.length]} [${team}]`,
      priority: sel[i % sel.length],
      firedAt: new Date(start + i * 36e5 * 9).toISOString(),
      reachedOpsgenie,
      acknowledged: reachedOpsgenie && (seed(team, piIndex, 30 + i) % 10) > 3,
      sourceUrl: "#",
    };
  });
}

// --- orphan alerts -----------------------------------------------------------
export const ORPHAN_ALERTS: OrphanAlert[] = [
  { sourceId: "dd-9001", platform: "datadog", name: "cpu-throttle-batch", rawTeamLabel: "team:batch-proc", priority: "Unknown", reason: "both", firedAt: "2026-02-20T08:14:00Z", sourceUrl: "#" },
  { sourceId: "cx-5521", platform: "coralogix", name: "ingest-lag-eu", rawTeamLabel: "grp/eu-data", priority: "P1", reason: "unmapped-team", firedAt: "2026-02-22T13:02:00Z", sourceUrl: "#" },
  { sourceId: "pd-77", platform: "pingdom", name: "status-page-check", rawTeamLabel: null, priority: "Unknown", reason: "both", firedAt: "2026-02-25T01:40:00Z", sourceUrl: "#" },
  { sourceId: "prom-310", platform: "prometheus", name: "KubePodCrashLooping", rawTeamLabel: "svc=legacy-cron", priority: "P1", reason: "unmapped-team", firedAt: "2026-03-01T19:25:00Z", sourceUrl: "#" },
  { sourceId: "og-1442", platform: "opsgenie", name: "manual-test-alert", rawTeamLabel: "Sandbox", priority: "Unknown", reason: "unknown-priority", firedAt: "2026-03-03T10:11:00Z", sourceUrl: "#" },
  { sourceId: "dd-9100", platform: "datadog", name: "synthetic-login", rawTeamLabel: "team:qa-temp", priority: "P1", reason: "unmapped-team", firedAt: "2026-03-04T22:48:00Z", sourceUrl: "#" },
  { sourceId: "cx-5610", platform: "coralogix", name: "trace-drop-rate", rawTeamLabel: "owner=unknown", priority: "Unknown", reason: "both", firedAt: "2026-03-06T05:33:00Z", sourceUrl: "#" },
];

/** Orphan count trend per PI (drops over time as teams fix tagging). */
export const ORPHAN_TREND = PIS.map((pi, i) => ({
  pi: pi.label,
  count: Math.max(2, 24 - i * 6 + (i % 2)),
}));

// --- data sources (FR-1) + ingestion health (observability) -----------------
export const DATA_SOURCES: DataSourceStatus[] = [
  { platform: "datadog", displayName: "Datadog", reads: "Monitors API · state-change events", status: "healthy", lastSyncIso: "2026-05-31T09:52:00Z", errorRatePct: 0.2, definitions: 412, firings24h: 138 },
  { platform: "prometheus", displayName: "Prometheus", reads: "Alertmanager rules · firing history (via Coralogix mirror)", status: "degraded", lastSyncIso: "2026-05-31T09:31:00Z", errorRatePct: 3.1, definitions: 96, firings24h: 41 },
  { platform: "coralogix", displayName: "Coralogix", reads: "Alerts API · triggered alerts", status: "healthy", lastSyncIso: "2026-05-31T09:55:00Z", errorRatePct: 0.6, definitions: 173, firings24h: 64 },
  { platform: "pingdom", displayName: "Pingdom", reads: "Checks API · check incidents", status: "healthy", lastSyncIso: "2026-05-31T09:40:00Z", errorRatePct: 0.0, definitions: 38, firings24h: 7 },
  { platform: "opsgenie", displayName: "Opsgenie", reads: "Alerts API · acks · activity log", status: "healthy", lastSyncIso: "2026-05-31T09:58:00Z", errorRatePct: 0.4, definitions: 0, firings24h: 121 },
];

export const INGESTION_JOBS: IngestionJob[] = [
  { id: "j-1042", kind: "firings", platform: "datadog", startedAt: "2026-05-31T09:52:00Z", durationSec: 38, status: "success", records: 138 },
  { id: "j-1041", kind: "acks", platform: "opsgenie", startedAt: "2026-05-31T09:50:00Z", durationSec: 22, status: "success", records: 47 },
  { id: "j-1040", kind: "firings", platform: "coralogix", startedAt: "2026-05-31T09:55:00Z", durationSec: 51, status: "success", records: 64 },
  { id: "j-1039", kind: "firings", platform: "prometheus", startedAt: "2026-05-31T09:31:00Z", durationSec: 73, status: "failed", records: 0, note: "429 from Coralogix mirror — will retry (Polly backoff)" },
  { id: "j-1038", kind: "definitions", platform: "all", startedAt: "2026-05-31T06:00:00Z", durationSec: 184, status: "success", records: 719 },
  { id: "j-1037", kind: "backfill", platform: "pingdom", startedAt: "2026-05-30T22:10:00Z", durationSec: 642, status: "success", records: 1203, note: "12-week backfill, resumed from checkpoint" },
  { id: "j-1043", kind: "firings", platform: "pingdom", startedAt: "2026-05-31T10:00:00Z", durationSec: 0, status: "running", records: 0 },
];

// --- config (FR-2 / configurability) — shown read-only in Settings ----------
export const TEAM_NORMALIZATION: { platform: Platform; rawLabel: string; canonical: string }[] = [
  { platform: "datadog", rawLabel: "team:vulcan-core", canonical: "vulcan" },
  { platform: "opsgenie", rawLabel: "Vulcan SRE", canonical: "vulcan" },
  { platform: "coralogix", rawLabel: "grp/argus", canonical: "argus" },
  { platform: "pingdom", rawLabel: "tag:dbops", canonical: "dbops" },
  { platform: "datadog", rawLabel: "team:atlas-platform", canonical: "atlas" },
  { platform: "opsgenie", rawLabel: "Hermes On-call", canonical: "hermes" },
];

export const PRIORITY_CONVENTIONS: { platform: Platform; rule: string }[] = [
  { platform: "datadog", rule: "tag priority:p1 → P1, else monitor.priority field" },
  { platform: "prometheus", rule: "labels severity / priority" },
  { platform: "coralogix", rule: "native severity field" },
  { platform: "pingdom", rule: "default P1 unless priority tag overrides" },
  { platform: "opsgenie", rule: "alert.priority (P1–P5)" },
];
