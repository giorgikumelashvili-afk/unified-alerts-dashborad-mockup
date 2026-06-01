import { useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** initial column width in px */
  width?: number;
  className?: string;
  cell: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}

/** A table with drag-to-resize columns (fixed layout + per-column width state). */
export function DataTable<T>({ columns, rows, rowKey, className }: Props<T>) {
  const [widths, setWidths] = useState<number[]>(() => columns.map((c) => c.width ?? 160));
  const drag = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const onMouseMove = (e: MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    const next = Math.max(80, d.startWidth + (e.clientX - d.startX));
    setWidths((w) => w.map((x, i) => (i === d.index ? next : x)));
  };

  const onMouseUp = () => {
    drag.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const startResize = (index: number) => (e: ReactMouseEvent) => {
    e.preventDefault();
    drag.current = { index, startX: e.clientX, startWidth: widths[index] };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const total = widths.reduce((a, b) => a + b, 0);

  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border", className)}>
      <table className="caption-bottom text-sm" style={{ width: total, tableLayout: "fixed" }}>
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="[&_tr]:border-b">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className="relative h-10 select-none px-3 text-left align-middle font-medium text-muted-foreground"
              >
                <span className="block truncate pr-2">{c.header}</span>
                {i < columns.length - 1 && (
                  <span
                    onMouseDown={startResize(i)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b transition-colors hover:bg-muted/50">
              {columns.map((c) => (
                <td key={c.key} className={cn("overflow-hidden px-3 py-3 align-middle", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
