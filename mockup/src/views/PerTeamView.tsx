import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ExportButton } from "@/components/ExportButton";
import { DataTable, type Column } from "@/components/DataTable";
import { PlatformBadge, PriorityBadge, YesNo } from "@/components/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_RANGE,
  METRIC_BY_KEY,
  PRIORITIES,
  TEAMS,
  firingRows,
  rangeTotals,
  weeklySeries,
} from "@/data/fakeData";
import type { DateRange, FiringRow, Priority } from "@/types";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDate, formatDateTime } from "@/lib/utils";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

const FIRED_SERIES = [
  { key: "Fired (Total)", color: "#ef4444" },
  { key: "Reached Opsgenie", color: "#8b5cf6" },
  { key: "Acknowledged", color: "#22c55e" },
];

const firingColumns: Column<FiringRow>[] = [
  { key: "name", header: "Alert", width: 240, className: "font-medium", cell: (r) => r.name },
  { key: "platform", header: "Platform", width: 120, cell: (r) => <PlatformBadge platform={r.platform} /> },
  { key: "priority", header: "Priority", width: 100, cell: (r) => <PriorityBadge priority={r.priority} /> },
  {
    key: "firedAt",
    header: "Fired",
    width: 160,
    className: "text-muted-foreground",
    cell: (r) => formatDateTime(r.firedAt),
  },
  {
    key: "reached",
    header: "Reached Opsgenie",
    width: 150,
    cell: (r) => <YesNo value={r.reachedOpsgenie} />,
  },
  { key: "acked", header: "Acked", width: 90, cell: (r) => <YesNo value={r.acknowledged} /> },
  {
    key: "source",
    header: "Source",
    width: 90,
    cell: (r) => (
      <a
        href={r.sourceUrl}
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        open <ExternalLink className="h-3 w-3" />
      </a>
    ),
  },
];

export default function PerTeamView() {
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [priorities, setPriorities] = useState<Priority[]>(DEFAULT_PRIORITIES);
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);

  const series = useMemo(() => weeklySeries(team, priorities, range), [team, priorities, range]);
  const totals = useMemo(() => rangeTotals(team, priorities, range), [team, priorities, range]);
  const rows = useMemo(() => firingRows(team, priorities, range), [team, priorities, range]);

  const firedData = series.map((p) => ({
    week: p.label,
    "Fired (Total)": p.firedTotal,
    "Reached Opsgenie": p.firedOpsgenie,
    Acknowledged: p.acked,
  }));
  const mttaData = series.map((p) => ({ week: p.label, Acknowledged: p.acked, "MTTA (min)": p.mttaMinutes }));

  const filename = `per-team_${team}_${formatDate(new Date())}.csv`;
  const exportCsv = () => {
    const csv = toCsv(
      ["week_start", "fired_total", "reached_opsgenie", "acked", "mtta_minutes"],
      series.map((p) => [p.weekStartIso.slice(0, 10), p.firedTotal, p.firedOpsgenie, p.acked, p.mttaMinutes]),
    );
    downloadCsv(filename, csv);
  };

  return (
    <div>
      <PageHeader
        title="Per-team"
        description="Firing and acknowledgement hygiene for a team over a selected date range."
        actions={<ExportButton filename={filename} onConfirm={exportCsv} />}
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Team</Label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Date range</Label>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Priorities</Label>
          <MultiSelect
            label="Priority scope"
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            selected={priorities}
            onChange={(next) => setPriorities(next.length ? (next as Priority[]) : DEFAULT_PRIORITIES)}
            placeholder="P1"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard meta={METRIC_BY_KEY.firedTotal} value={totals.firedTotal} />
        <MetricCard meta={METRIC_BY_KEY.firedOpsgenie} value={totals.firedOpsgenie} />
        <MetricCard meta={METRIC_BY_KEY.acked} value={totals.acked} />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Firings over time</CardTitle>
          <CardDescription>Weekly buckets across the selected range.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={firedData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {FIRED_SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">MTTA vs acknowledged alerts</CardTitle>
          <CardDescription>
            Mean time to acknowledge (line) against the volume of acked alerts (bars), so spikes can be read
            in context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={mttaData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="Acknowledged" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={18} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="MTTA (min)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Firings</CardTitle>
          <CardDescription>
            Underlying firings in the range, each linking back to the source platform. Drag column edges to
            resize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={firingColumns} rows={rows} rowKey={(r) => r.sourceId} />
        </CardContent>
      </Card>
    </div>
  );
}
