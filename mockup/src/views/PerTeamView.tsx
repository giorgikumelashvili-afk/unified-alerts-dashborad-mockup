import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { PlatformBadge, PriorityBadge, YesNo } from "@/components/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_PRIORITIES, METRICS, PIS, PRIORITIES, TEAMS,
  drillDownAlerts, seriesForTeam, subBuckets,
} from "@/data/fakeData";
import type { Granularity, Priority } from "@/types";
import { formatDateTime } from "@/lib/utils";

const SERIES = [
  { key: "Defined", color: "#3b82f6", axis: "left" },
  { key: "Fired (Total)", color: "#ef4444", axis: "left" },
  { key: "Fired → Opsgenie", color: "#8b5cf6", axis: "left" },
  { key: "Acked", color: "#22c55e", axis: "left" },
  { key: "MTTA (min)", color: "#f59e0b", axis: "right" },
] as const;

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

export default function PerTeamView() {
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [priorities, setPriorities] = useState<Priority[]>(DEFAULT_PRIORITIES);
  const [drillPi, setDrillPi] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("weekly");

  const rows = useMemo(() => seriesForTeam(team, priorities), [team, priorities]);
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const compliance = latest.firedTotal ? Math.round((latest.firedOpsgenie / latest.firedTotal) * 100) : 0;

  const chartData = rows.map((r) => ({
    pi: PIS.find((p) => p.id === r.piId)!.label,
    piId: r.piId,
    "Defined": r.defined,
    "Fired (Total)": r.firedTotal,
    "Fired → Opsgenie": r.firedOpsgenie,
    "Acked": r.acked,
    "MTTA (min)": r.mttaMinutes,
  }));

  const drillAlerts = drillPi ? drillDownAlerts(team, drillPi, priorities) : [];
  const drillPiLabel = PIS.find((p) => p.id === drillPi)?.label;
  const subData = drillPi ? subBuckets(team, drillPi, priorities, granularity, "firedTotal") : [];

  return (
    <div>
      <PageHeader
        title="Per-team — alerting hygiene"
        description="The five metrics per (team, PI). Click a chart point to drill into weekly/daily and the underlying alerts."
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Team</Label>
          <Select value={team} onValueChange={(v) => { setTeam(v); setDrillPi(null); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Priorities</Label>
          <MultiSelect
            label="Priority scope"
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            selected={priorities}
            onChange={(next) => setPriorities(next.length ? (next as Priority[]) : DEFAULT_PRIORITIES)}
            placeholder="P1"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Routing compliance</span>
          <Badge variant={compliance >= 80 ? "success" : compliance >= 60 ? "warning" : "destructive"}>
            {compliance}%
          </Badge>
          <span className="text-xs text-muted-foreground">({PIS.find((p) => p.id === latest.piId)?.label})</span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((m) => <MetricCard key={m.key} meta={m} value={latest[m.key]} prev={prev?.[m.key]} />)}
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trend across PIs</CardTitle>
          <CardDescription>Counts on the left axis, MTTA (min) on the right. Click a point to drill in.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
              onClick={(s: any) => {
                const hit = s?.activeLabel && chartData.find((d) => d.pi === s.activeLabel);
                if (hit) setDrillPi(hit.piId);
              }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="pi" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SERIES.map((s) => (
                <Line
                  key={s.key} yAxisId={s.axis} type="monotone" dataKey={s.key}
                  stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  strokeDasharray={s.axis === "right" ? "5 4" : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {drillPi && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base capitalize">Drill-down — {team} · {drillPiLabel}</CardTitle>
              <CardDescription>Sub-PI breakdown (FR-5) and the underlying firings with source links.</CardDescription>
            </div>
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={granularity === "daily" ? 4 : 0} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                <Bar dataKey="value" name="Fired (Total)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead><TableHead>Platform</TableHead><TableHead>Priority</TableHead>
                    <TableHead>Fired</TableHead><TableHead>→ Opsgenie</TableHead><TableHead>Acked</TableHead><TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillAlerts.map((a) => (
                    <TableRow key={a.sourceId}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell><PlatformBadge platform={a.platform} /></TableCell>
                      <TableCell><PriorityBadge priority={a.priority} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(a.firedAt)}</TableCell>
                      <TableCell><YesNo value={a.reachedOpsgenie} /></TableCell>
                      <TableCell><YesNo value={a.acknowledged} /></TableCell>
                      <TableCell>
                        <a href={a.sourceUrl} onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-primary hover:underline">
                          open <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
