import { useState } from "react";
import { Info } from "lucide-react";
import { PlatformBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PIS, PRIORITY_CONVENTIONS, TEAM_NORMALIZATION } from "@/data/fakeData";
import { formatDate } from "@/lib/utils";

export default function SettingsView() {
  const [businessHours, setBusinessHours] = useState(false);
  const [tz, setTz] = useState("UTC");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        All configuration lives in editable config (file or DB) — changeable without a redeploy. Shown read-only in this mockup.
      </div>

      {/* PI calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PI calendar</CardTitle>
          <CardDescription>Configurable 6-week windows. Drives how firings bucket into PIs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow><TableHead>PI</TableHead><TableHead>Start date (dd-mm-yyyy)</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {PIS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.startDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* team normalization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team normalization map</CardTitle>
          <CardDescription>Platform label → canonical team key. Unmapped labels surface as orphans.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Platform</TableHead><TableHead>Raw label</TableHead><TableHead>Canonical</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {TEAM_NORMALIZATION.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell><PlatformBadge platform={m.platform} /></TableCell>
                    <TableCell className="font-mono text-xs">{m.rawLabel}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{m.canonical}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* priority conventions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Priority conventions</CardTitle>
          <CardDescription>How each platform encodes priority — discovery is config-driven (FR-1).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Platform</TableHead><TableHead>Rule</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {PRIORITY_CONVENTIONS.map((c) => (
                  <TableRow key={c.platform}>
                    <TableCell><PlatformBadge platform={c.platform} /></TableCell>
                    <TableCell className="text-muted-foreground">{c.rule}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MTTA + cadence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">MTTA & ingestion cadence</CardTitle>
          <CardDescription>Business-hours MTTA variant is schema-ready (FR-3). Cadence per FR-6.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Business-hours-only MTTA</Label>
              <p className="text-xs text-muted-foreground">Default: include all wall-clock hours.</p>
            </div>
            <Switch checked={businessHours} onCheckedChange={setBusinessHours} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="tz">Timezone</Label>
              <p className="text-xs text-muted-foreground">Used by the business-hours variant.</p>
            </div>
            <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground">Firings / acks</div>
              <div className="font-medium">Hourly</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground">Definitions</div>
              <div className="font-medium">Daily</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
