// Types mirror the data-model sketch in docs/architecture.md.
// MOCKUP ONLY — these back fake data, not a real API.

export type Platform = "datadog" | "prometheus" | "coralogix" | "pingdom" | "opsgenie";

export type Priority = "P1" | "P2" | "P3" | "P4" | "P5" | "Unknown";

/** Metrics surfaced per team. Default scope = P1 (epic v1). */
export type MetricKey = "defined" | "firedTotal" | "firedOpsgenie" | "acked" | "mttaMinutes";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  hint: string;
  /** Lower is better (e.g. MTTA) -> affects trend coloring. */
  lowerIsBetter?: boolean;
  unit?: string;
}

export interface ProgramIncrement {
  id: string; // e.g. "PI-2026-1"
  label: string; // e.g. "PI 2026-1"
  startDate: string; // ISO date — 6-week windows
}

/** An inclusive from/to selection driven by the range calendar. */
export interface DateRange {
  from: Date;
  to: Date;
}

/** A point in a weekly time series. */
export interface WeeklyPoint {
  weekStartIso: string;
  label: string; // dd-mm
  firedTotal: number;
  firedOpsgenie: number;
  acked: number;
  mttaMinutes: number;
}

/** A raw firing row for the per-team firings table. */
export interface FiringRow {
  sourceId: string;
  platform: Platform;
  name: string;
  priority: Priority;
  firedAt: string; // ISO
  reachedOpsgenie: boolean;
  acknowledged: boolean;
  sourceUrl: string; // dead "#" link in the mockup
}

/** A defined alert (alert_definition) for the Defined alerts view. */
export interface DefinedAlert {
  sourceId: string;
  platform: Platform;
  team: string;
  name: string;
  priority: Priority;
  createdAt: string; // ISO — matches alert_definition.created_at
  sourceUrl: string;
}
