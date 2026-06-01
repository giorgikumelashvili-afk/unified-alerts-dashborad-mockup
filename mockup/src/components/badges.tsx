import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/types";

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge variant="secondary" className="font-normal capitalize">{platform}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "Unknown") return <Badge variant="warning">Unknown</Badge>;
  if (priority === "P1") return <Badge variant="destructive">P1</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

export function YesNo({ value }: { value: boolean }) {
  return <Badge variant={value ? "success" : "destructive"}>{value ? "yes" : "no"}</Badge>;
}
