import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PRIORITIES, METRICS, PIS, PRIORITIES, TEAMS,
  aggregateForPi, seriesForTeam,
} from "@/data/fakeData";
import type { Priority } from "@/types";
import { formatDate } from "@/lib/utils";

type Mode = "per-team" | "all-teams";

function buildPerTeamCsv(team: string, priorities: Priority[], withCalendar: boolean): string {
  const head = ["pi", ...METRICS.map((m) => m.key)].join(",");
  const body = seriesForTeam(team, priorities).map((r) =>
    [r.piId, r.defined, r.firedTotal, r.firedOpsgenie, r.acked, r.mttaMinutes].join(","),
  );
  const cal = withCalendar ? ["", "# PI calendar", "pi,startDate", ...PIS.map((p) => `${p.id},${p.startDate}`)] : [];
  return [`# scope: team=${team} priorities=${priorities.join("|")}`, head, ...body, ...cal].join("\n");
}

function buildAllTeamsCsv(priorities: Priority[], withCalendar: boolean): string {
  // one row per (PI, metric); columns = each team + average/median/p90
  const head = ["pi", "metric", ...TEAMS, "average", "median", "p90"].join(",");
  const rows: string[] = [];
  for (const pi of PIS) {
    for (const m of METRICS) {
      const perTeam = TEAMS.map((t) => seriesForTeam(t, priorities).find((r) => r.piId === pi.id)![m.key]);
      const agg = aggregateForPi(pi.id, m.key, priorities);
      rows.push([pi.id, m.key, ...perTeam, agg.average, agg.median, agg.p90].join(","));
    }
  }
  const cal = withCalendar ? ["", "# PI calendar", "pi,startDate", ...PIS.map((p) => `${p.id},${p.startDate}`)] : [];
  return [`# scope: all-teams priorities=${priorities.join("|")}`, head, ...rows, ...cal].join("\n");
}

export default function ExportView() {
  const [mode, setMode] = useState<Mode>("per-team");
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [priorities, setPriorities] = useState<Priority[]>(DEFAULT_PRIORITIES);
  const [withCalendar, setWithCalendar] = useState(true);

  const csv = useMemo(
    () => (mode === "per-team" ? buildPerTeamCsv(team, priorities, withCalendar) : buildAllTeamsCsv(priorities, withCalendar)),
    [mode, team, priorities, withCalendar],
  );

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "per-team" ? `alerts_${team}_${formatDate(new Date())}.csv` : `alerts_all-teams_${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Export"
        description="FR-7: CSV for per-team time series and the all-teams aggregate. The PI calendar can be embedded so consumers can reconstruct PI boundaries."
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Build export</CardTitle>
          <CardDescription>This mockup builds a real CSV from the fake data — no backend involved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="per-team">Per-team series</TabsTrigger>
              <TabsTrigger value="all-teams">All-teams aggregate</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-end gap-4">
            {mode === "per-team" && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Team</Label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAMS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div className="flex items-center gap-2 pb-1.5">
              <Switch id="cal" checked={withCalendar} onCheckedChange={setWithCalendar} />
              <Label htmlFor="cal">Include PI calendar</Label>
            </div>
            <Button onClick={download} className="ml-auto"><Download className="h-4 w-4" /> Download CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>Exactly what downloads — matches the numbers shown in the UI for the same scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">{csv}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
