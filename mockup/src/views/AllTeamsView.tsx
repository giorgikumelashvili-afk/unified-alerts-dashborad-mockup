import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_PRIORITIES, METRICS, PIS, PRIORITIES, TEAMS, aggregateForPi, metricsForPi,
} from "@/data/fakeData";
import type { MetricKey, Priority } from "@/types";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

export default function AllTeamsView() {
  const [metric, setMetric] = useState<MetricKey>("firedTotal");
  const [piId, setPiId] = useState<string>(PIS[PIS.length - 1].id);
  const [priorities, setPriorities] = useState<Priority[]>(DEFAULT_PRIORITIES);

  const meta = METRICS.find((m) => m.key === metric)!;
  const agg = aggregateForPi(piId, metric, priorities);

  const data = useMemo(() => {
    const rows = metricsForPi(piId, priorities);
    return TEAMS.map((t) => ({ team: t, value: rows.find((x) => x.team === t)![metric] as number }));
  }, [piId, metric, priorities]);

  const unit = meta.unit ? ` ${meta.unit}` : "";

  return (
    <div>
      <PageHeader
        title="All-teams comparison"
        description="Benchmark every team on one metric for a PI. FR-4: average, median and P90 are all stored."
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Metric</Label>
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">PI</Label>
          <Select value={piId} onValueChange={setPiId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
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
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {([["Average", agg.average], ["Median", agg.median], ["P90", agg.p90]] as const).map(([k, v]) => (
          <Card key={k} className="p-4">
            <div className="text-xs font-medium text-muted-foreground">{k} · all teams</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{v}{unit}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{meta.label} — by team · {PIS.find((p) => p.id === piId)?.label}</CardTitle>
          <CardDescription>{meta.hint}. Dashed line = all-teams average. Bars colored by good/bad vs average.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={12} className="capitalize" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
              <ReferenceLine
                y={agg.average}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{ value: `avg ${agg.average}${unit}`, fill: "#ef4444", position: "right", fontSize: 12 }}
              />
              <Bar dataKey="value" name={meta.label} radius={[4, 4, 0, 0]}>
                {data.map((d) => {
                  const above = d.value >= agg.average;
                  const good = meta.lowerIsBetter ? !above : above;
                  return <Cell key={d.team} fill={good ? "#22c55e" : "#ef4444"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
