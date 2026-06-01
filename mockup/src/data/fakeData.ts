// Deterministic fake data (no Math.random) so the mockup renders identically
// every load. MOCKUP ONLY — none of this comes from a real platform.

import type {
  DateRange,
  DefinedAlert,
  FiringRow,
  MetricKey,
  MetricMeta,
  Platform,
  Priority,
  WeeklyPoint,
} from "../types";

export const TEAMS = ["vulcan", "argus", "dbops", "atlas", "hermes"] as const;
export type Team = (typeof TEAMS)[number];

export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4", "P5"];
/** Epic v1 scope is P1; UI defaults here. */
export const DEFAULT_PRIORITIES: Priority[] = ["P1"];

/** Fixed "now" so the mockup is deterministic (real app would use the clock). */
export const TODAY = new Date(2026, 4, 31); // 31-05-2026
export const DEFAULT_RANGE: DateRange = {
  from: new Date(TODAY.getTime() - 12 * 7 * 864e5),
  to: TODAY,
};

export const METRICS: MetricMeta[] = [
  { key: "defined", label: "Defined", hint: "Distinct alert definitions owned" },
  { key: "firedTotal", label: "Fired (Total)", hint: "Firings in the range" },
  {
    key: "firedOpsgenie",
    label: "Reached Opsgenie",
    hint: "Subset that reached Opsgenie (routing compliance)",
  },
  { key: "acked", label: "Acknowledged", hint: "Explicitly acked by a human in Opsgenie" },
  {
    key: "mttaMinutes",
    label: "MTTA (min)",
    hint: "Mean time to acknowledge, wall-clock",
    lowerIsBetter: true,
    unit: "min",
  },
];

export const METRIC_BY_KEY: Record<MetricKey, MetricMeta> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<MetricKey, MetricMeta>;

export const FIRING_METRIC_KEYS: MetricKey[] = ["firedTotal", "firedOpsgenie", "acked"];

// --- deterministic pseudo-values --------------------------------------------
function seed(key: string, ordinal: number, salt: number): number {
  let h = salt;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return (h + ordinal * 17) % 9973;
}
const between = (n: number, lo: number, hi: number) => lo + (n % (hi - lo + 1));

const PRIORITY_SALT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, Unknown: 9 };
const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 1.6, P3: 2.4, P4: 1.2, P5: 0.6, Unknown: 0 };

/** Stable week ordinal so a given calendar week always yields the same numbers. */
function weekOrdinal(d: Date): number {
  return Math.floor(d.getTime() / (7 * 864e5));
}

/** Monday on/before the given date. */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

function weekStarts(range: DateRange): Date[] {
  const out: Date[] = [];
  let cur = startOfWeekMonday(range.from);
  const end = range.to.getTime();
  while (cur.getTime() <= end) {
    out.push(new Date(cur));
    cur = new Date(cur.getTime() + 7 * 864e5);
  }
  return out.length ? out : [startOfWeekMonday(range.from)];
}

function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface WeekMetrics {
  firedTotal: number;
  firedOpsgenie: number;
  acked: number;
  mttaMinutes: number;
}

function weekForPriority(team: string, ord: number, p: Priority): WeekMetrics {
  const s = (salt: number) => seed(team, ord, salt + PRIORITY_SALT[p] * 50);
  const w = PRIORITY_WEIGHT[p];
  const firedTotal = Math.round(between(s(7), 1, 9) * w);
  const compliance = Math.min(1, 0.6 + (s(9) % 30) / 100);
  const firedOpsgenie = Math.round(firedTotal * compliance);
  const acked = Math.min(firedOpsgenie, Math.round(firedOpsgenie * (0.6 + (s(11) % 35) / 100)));
  const mttaMinutes = Math.max(3, between(s(13), 6, 40));
  return { firedTotal, firedOpsgenie, acked, mttaMinutes };
}

/** Weekly firing/MTTA series for a team over a date range and selected priorities. */
export function weeklySeries(team: string, priorities: Priority[], range: DateRange): WeeklyPoint[] {
  const sel = priorities.length ? priorities : DEFAULT_PRIORITIES;
  return weekStarts(range).map((ws) => {
    const ord = weekOrdinal(ws);
    const rows = sel.map((p) => weekForPriority(team, ord, p));
    const sum = (k: keyof WeekMetrics) => rows.reduce((a, r) => a + r[k], 0);
    const ackTotal = sum("acked");
    const mtta = ackTotal
      ? Math.round(rows.reduce((a, r) => a + r.mttaMinutes * r.acked, 0) / ackTotal)
      : Math.round(rows.reduce((a, r) => a + r.mttaMinutes, 0) / rows.length);
    return {
      weekStartIso: ws.toISOString(),
      label: ddmm(ws),
      firedTotal: sum("firedTotal"),
      firedOpsgenie: sum("firedOpsgenie"),
      acked: ackTotal,
      mttaMinutes: mtta,
    };
  });
}

export interface RangeTotals {
  firedTotal: number;
  firedOpsgenie: number;
  acked: number;
  mttaMinutes: number;
}

export function rangeTotals(team: string, priorities: Priority[], range: DateRange): RangeTotals {
  const series = weeklySeries(team, priorities, range);
  const firedTotal = series.reduce((a, p) => a + p.firedTotal, 0);
  const firedOpsgenie = series.reduce((a, p) => a + p.firedOpsgenie, 0);
  const acked = series.reduce((a, p) => a + p.acked, 0);
  const ackWeighted = series.reduce((a, p) => a + p.mttaMinutes * p.acked, 0);
  const mttaMinutes = acked ? Math.round(ackWeighted / acked) : 0;
  return { firedTotal, firedOpsgenie, acked, mttaMinutes };
}

// --- per-team firings table --------------------------------------------------
const PLATFORMS: Platform[] = ["datadog", "coralogix", "pingdom", "prometheus", "opsgenie"];
const ALERT_NAMES = [
  "HighErrorRate-checkout",
  "DBReplicaLag",
  "QueueDepthCritical",
  "5xx-spike-gateway",
  "DiskPressure-node",
  "CertExpiry",
  "LatencyP99-payments",
  "MemoryLeak-worker",
  "KafkaConsumerLag",
  "RedisEvictions",
];

export function firingRows(team: string, priorities: Priority[], range: DateRange): FiringRow[] {
  const sel = priorities.length ? priorities : DEFAULT_PRIORITIES;
  const total = Math.min(rangeTotals(team, priorities, range).firedTotal, 12);
  const start = range.from.getTime();
  return Array.from({ length: total }, (_, i) => {
    const ord = weekOrdinal(range.from) + i;
    const platform = PLATFORMS[(i + ord) % PLATFORMS.length];
    const reachedOpsgenie = seed(team, ord, 20 + i) % 10 > 2;
    return {
      sourceId: `${platform}-${team}-${i}`,
      platform,
      name: `${ALERT_NAMES[(i + ord) % ALERT_NAMES.length]} [${team}]`,
      priority: sel[i % sel.length],
      firedAt: new Date(start + i * 36e5 * 18).toISOString(),
      reachedOpsgenie,
      acknowledged: reachedOpsgenie && seed(team, ord, 30 + i) % 10 > 3,
      sourceUrl: "#",
    };
  });
}

// --- defined alerts (alert_definition) --------------------------------------
function buildDefinedAlerts(): DefinedAlert[] {
  const out: DefinedAlert[] = [];
  let id = 0;
  // Spread creation dates across ~7 months ending near TODAY.
  for (let i = 0; i < 30; i++) {
    const team = TEAMS[i % TEAMS.length];
    const platform = PLATFORMS[(i + 1) % PLATFORMS.length];
    const monthsAgo = i % 7; // 0..6
    const created = new Date(TODAY.getFullYear(), TODAY.getMonth() - monthsAgo, 2 + (i % 25));
    out.push({
      sourceId: `${platform}-def-${id++}`,
      platform,
      team,
      name: `${ALERT_NAMES[i % ALERT_NAMES.length]} [${team}]`,
      priority: i % 3 === 0 ? "P1" : (PRIORITIES[i % PRIORITIES.length] ?? "P1"),
      createdAt: created.toISOString(),
      sourceUrl: "#",
    });
  }
  return out.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export const DEFINED_ALERTS: DefinedAlert[] = buildDefinedAlerts();

export interface DefinedPoint {
  label: string;
  weekStartIso: string;
  count: number;
}

/** Cumulative count of definitions that exist at each week end across the range. */
export function definedSeries(range: DateRange, team: string | "all"): DefinedPoint[] {
  const pool = team === "all" ? DEFINED_ALERTS : DEFINED_ALERTS.filter((d) => d.team === team);
  return weekStarts(range).map((ws) => {
    const weekEnd = ws.getTime() + 7 * 864e5;
    return {
      label: ddmm(ws),
      weekStartIso: ws.toISOString(),
      count: pool.filter((d) => +new Date(d.createdAt) < weekEnd).length,
    };
  });
}
