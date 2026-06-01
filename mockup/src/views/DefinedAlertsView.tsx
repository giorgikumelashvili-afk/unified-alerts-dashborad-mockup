import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ExportButton } from "@/components/ExportButton";
import { DataTable, type Column } from "@/components/DataTable";
import { PlatformBadge, PriorityBadge } from "@/components/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_RANGE, DEFINED_ALERTS, TEAMS, definedSeries } from "@/data/fakeData";
import type { DateRange, DefinedAlert } from "@/types";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

const definedColumns: Column<DefinedAlert>[] = [
  { key: "name", header: "Alert", width: 240, className: "font-medium", cell: (d) => d.name },
  { key: "platform", header: "Platform", width: 120, cell: (d) => <PlatformBadge platform={d.platform} /> },
  { key: "team", header: "Team", width: 120, className: "capitalize", cell: (d) => d.team },
  { key: "priority", header: "Priority", width: 100, cell: (d) => <PriorityBadge priority={d.priority} /> },
  {
    key: "createdAt",
    header: "Created",
    width: 130,
    className: "text-muted-foreground",
    cell: (d) => formatDate(d.createdAt),
  },
  {
    key: "source",
    header: "Source",
    width: 90,
    cell: (d) => (
      <a
        href={d.sourceUrl}
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        open <ExternalLink className="h-3 w-3" />
      </a>
    ),
  },
];

export default function DefinedAlertsView() {
  const [team, setTeam] = useState<string>("all");
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);

  const chartData = useMemo(() => definedSeries(range, team), [range, team]);
  const rows = useMemo(
    () => (team === "all" ? DEFINED_ALERTS : DEFINED_ALERTS.filter((d) => d.team === team)),
    [team],
  );

  const today = formatDate(new Date());
  const seriesFile = `defined-alerts_${team}_series_${today}.csv`;
  const listFile = `defined-alerts_${team}_${today}.csv`;

  const exportSeries = () =>
    downloadCsv(
      seriesFile,
      toCsv(
        ["week_start", "defined_count"],
        chartData.map((p) => [p.weekStartIso.slice(0, 10), p.count]),
      ),
    );

  const exportList = () =>
    downloadCsv(
      listFile,
      toCsv(
        ["source_id", "platform", "team", "name", "priority", "created_at"],
        rows.map((d) => [d.sourceId, d.platform, d.team, d.name, d.priority, d.createdAt.slice(0, 10)]),
      ),
    );

  return (
    <div>
      <PageHeader
        title="Defined alerts"
        description="Which alert definitions exist and how that count has grown over time."
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Team</Label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
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
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Defined alerts over time</CardTitle>
              <CardDescription>
                Count of alert definitions that exist at each week across the range.
              </CardDescription>
            </div>
            <ExportButton filename={seriesFile} onConfirm={exportSeries} />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                name="Defined alerts"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Definitions ({rows.length})</CardTitle>
              <CardDescription>
                Each definition links back to the source platform. Drag column edges to resize.
              </CardDescription>
            </div>
            <ExportButton filename={listFile} onConfirm={exportList} />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={definedColumns} rows={rows} rowKey={(d) => d.sourceId} maxHeight={440} />
        </CardContent>
      </Card>
    </div>
  );
}
