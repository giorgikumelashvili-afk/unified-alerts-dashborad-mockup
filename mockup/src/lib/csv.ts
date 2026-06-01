/** Trigger a client-side CSV download (mockup builds CSV from fake data). */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
