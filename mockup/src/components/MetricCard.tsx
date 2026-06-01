import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MetricMeta } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  meta: MetricMeta;
  value: number;
  prev?: number; // previous-PI value for the trend delta
}

export default function MetricCard({ meta, value, prev }: Props) {
  const hasDelta = prev !== undefined && prev !== value;
  const rising = hasDelta && value > prev!;
  const improving = meta.lowerIsBetter ? !rising : rising; // for MTTA, a drop is good
  const diff = hasDelta ? Math.round((value - prev!) * 10) / 10 : 0;

  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted-foreground">{meta.label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {meta.unit && <span className="text-sm text-muted-foreground">{meta.unit}</span>}
      </div>
      {hasDelta && (
        <div
          className={cn(
            "mt-1 flex items-center gap-0.5 text-xs font-semibold",
            improving ? "text-success" : "text-destructive",
          )}
        >
          {rising ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(diff)}
          {meta.unit ? ` ${meta.unit}` : ""}{" "}
          <span className="font-normal text-muted-foreground">vs prev PI</span>
        </div>
      )}
      <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{meta.hint}</div>
    </Card>
  );
}
