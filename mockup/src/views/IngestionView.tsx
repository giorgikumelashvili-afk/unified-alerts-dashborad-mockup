import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DATA_SOURCES, INGESTION_JOBS, PIS, TEAMS } from "@/data/fakeData";
import type { DataSourceStatus, IngestionJob } from "@/types";
import { formatDateTime } from "@/lib/utils";

function SourceStatusBadge({ status }: { status: DataSourceStatus["status"] }) {
  if (status === "healthy") return <Badge variant="success">healthy</Badge>;
  if (status === "degraded") return <Badge variant="warning">degraded</Badge>;
  return <Badge variant="destructive">down</Badge>;
}

function JobStatus({ status }: { status: IngestionJob["status"] }) {
  if (status === "success") return <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" />success</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1.5 text-destructive"><XCircle className="h-4 w-4" />failed</span>;
  return <span className="inline-flex items-center gap-1.5 text-primary"><Loader2 className="h-4 w-4 animate-spin" />running</span>;
}

export default function IngestionView() {
  return (
    <div>
      <PageHeader
        title="Ingestion & jobs"
        description="FR-1 sources, FR-6 scheduling/backfill, and the dashboard's own observability — all read-only here."
      />

      {/* data sources (FR-1) */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Data sources</h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {DATA_SOURCES.map((s) => (
          <Card key={s.platform}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm capitalize">{s.displayName}</CardTitle>
              <SourceStatusBadge status={s.status} />
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <div>{s.reads}</div>
              <div className="flex justify-between"><span>Last sync</span><span className="text-foreground">{formatDateTime(s.lastSyncIso)}</span></div>
              <div className="flex justify-between"><span>Error rate</span><span className={s.errorRatePct > 1 ? "text-warning" : "text-foreground"}>{s.errorRatePct}%</span></div>
              <div className="flex justify-between"><span>Definitions · firings 24h</span><span className="text-foreground">{s.definitions} · {s.firings24h}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* on-demand backfill (FR-6) */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">On-demand backfill</CardTitle>
          <CardDescription>Per platform · team · date range. ≥12 weeks at launch, idempotent and resumable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Platform</Label>
              <Select defaultValue="all">
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {DATA_SOURCES.map((s) => <SelectItem key={s.platform} value={s.platform} className="capitalize">{s.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Team</Label>
              <Select defaultValue="all">
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {TEAMS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">From PI</Label>
              <Select defaultValue={PIS[0].id}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled title="Mockup — no backend">Trigger backfill</Button>
            <span className="text-xs text-muted-foreground">(disabled in mockup)</span>
          </div>
        </CardContent>
      </Card>

      {/* recent runs (observability) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent runs</CardTitle>
          <CardDescription>Hourly firings/acks, daily definitions. Each run records its own success/failure (OTel → Datadog).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead><TableHead>Kind</TableHead><TableHead>Platform</TableHead>
                  <TableHead>Started</TableHead><TableHead>Duration</TableHead><TableHead>Records</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INGESTION_JOBS.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{j.id}</TableCell>
                    <TableCell className="capitalize">{j.kind}</TableCell>
                    <TableCell>{j.platform === "all" ? <Badge variant="secondary">all</Badge> : <PlatformBadge platform={j.platform} />}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(j.startedAt)}</TableCell>
                    <TableCell className="text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{j.durationSec}s</span></TableCell>
                    <TableCell className="tabular-nums">{j.records}</TableCell>
                    <TableCell>
                      <JobStatus status={j.status} />
                      {j.note && <div className="text-[11px] text-muted-foreground">{j.note}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
