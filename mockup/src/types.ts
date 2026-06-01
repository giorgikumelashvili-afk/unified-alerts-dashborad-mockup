// Types mirror the data-model sketch in docs/architecture.md.
// MOCKUP ONLY — these back fake data, not a real API.

export type Platform =
  | "datadog"
  | "prometheus"
  | "coralogix"
  | "pingdom"
  | "opsgenie";

export type Priority = "P1" | "P2" | "P3" | "P4" | "P5" | "Unknown";

/** The five metrics surfaced per (team, PI). Default scope = P1 (epic v1). */
export type MetricKey =
  | "defined"
  | "firedTotal"
  | "firedOpsgenie"
  | "acked"
  | "mttaMinutes";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  hint: string;
  /** Lower is better (e.g. MTTA) → affects trend coloring. */
  lowerIsBetter?: boolean;
  unit?: string;
}

export interface ProgramIncrement {
  id: string; // e.g. "PI-2026-1"
  label: string; // e.g. "PI 2026-1"
  startDate: string; // ISO date — 6-week windows
}

/** One (team, PI) computed aggregate row → team_pi_metric. */
export interface TeamPiMetrics {
  team: string;
  piId: string;
  defined: number;
  firedTotal: number;
  firedOpsgenie: number;
  acked: number;
  mttaMinutes: number;
}

export type Granularity = "weekly" | "daily";

/** A raw firing/definition row for chart drill-down. */
export interface DrillDownAlert {
  sourceId: string;
  platform: Platform;
  name: string;
  priority: Priority;
  firedAt: string; // ISO
  reachedOpsgenie: boolean;
  acknowledged: boolean;
  sourceUrl: string; // dead "#" link in the mockup
}

/** Alert whose team or priority could not be discovered → orphan view. */
export interface OrphanAlert {
  sourceId: string;
  platform: Platform;
  name: string;
  rawTeamLabel: string | null;
  priority: Priority;
  reason: "unmapped-team" | "unknown-priority" | "both";
  firedAt: string;
  sourceUrl: string;
}

/** FR-1 + observability: per-platform ingestion health. */
export interface DataSourceStatus {
  platform: Platform;
  displayName: string;
  reads: string; // what the collector reads
  status: "healthy" | "degraded" | "down";
  lastSyncIso: string;
  errorRatePct: number;
  definitions: number;
  firings24h: number;
}

/** FR-6: a scheduled ingestion / backfill run. */
export interface IngestionJob {
  id: string;
  kind: "firings" | "acks" | "definitions" | "backfill";
  platform: Platform | "all";
  startedAt: string;
  durationSec: number;
  status: "success" | "failed" | "running";
  records: number;
  note?: string;
}
