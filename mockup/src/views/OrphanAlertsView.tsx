import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PlatformBadge, PriorityBadge } from "@/components/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORPHAN_ALERTS, ORPHAN_TREND } from "@/data/fakeData";
import type { OrphanAlert } from "@/types";
import { formatDateTime } from "@/lib/utils";

const REASON_LABEL: Record<OrphanAlert["reason"], string> = {
  "unmapped-team": "Team not in normalization map",
  "unknown-priority": "Priority not discoverable",
  both: "Team + priority unknown",
};

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
};

export default function OrphanAlertsView() {
  const [filter, setFilter] = useState<"all" | OrphanAlert["reason"]>("all");
  const rows = filter === "all" ? ORPHAN_ALERTS : ORPHAN_ALERTS.filter((o) => o.reason === filter);

  return (
    <div>
      <PageHeader
        title="Orphan alerts"
        description="Alerts whose team or priority couldn't be discovered from platform metadata. Surfaced, never dropped — so teams fix tagging at the source."
      />

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Orphan count trend</CardTitle>
          <CardDescription>Success criterion: this should drop PI-over-PI as teams fix tagging.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ORPHAN_TREND}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="pi" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" name="Orphan alerts" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Reason</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({ORPHAN_ALERTS.length})</SelectItem>
              <SelectItem value="unmapped-team">Unmapped team</SelectItem>
              <SelectItem value="unknown-priority">Unknown priority</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead><TableHead>Platform</TableHead><TableHead>Raw team label</TableHead>
                  <TableHead>Priority</TableHead><TableHead>Reason</TableHead><TableHead>Fired</TableHead><TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.sourceId}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell><PlatformBadge platform={o.platform} /></TableCell>
                    <TableCell>{o.rawTeamLabel ?? <span className="text-muted-foreground">— none —</span>}</TableCell>
                    <TableCell><PriorityBadge priority={o.priority} /></TableCell>
                    <TableCell className="text-muted-foreground">{REASON_LABEL[o.reason]}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(o.firedAt)}</TableCell>
                    <TableCell>
                      <a href={o.sourceUrl} onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-primary hover:underline">
                        open <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length === 0 && <div className="py-10 text-center text-muted-foreground">No orphan alerts for this filter. 🎉</div>}
        </CardContent>
      </Card>
    </div>
  );
}
