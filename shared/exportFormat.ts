export type ExportColumn = { key: string; label: string };
export type ExportRow = Record<string, string | number | null | undefined>;

export function escapeCsvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildCsvContent(columns: ExportColumn[], rows: ExportRow[]) {
  return [
    columns.map(column => escapeCsvValue(column.label)).join(";"),
    ...rows.map(row => columns.map(column => escapeCsvValue(row[column.key])).join(";")),
  ].join("\n");
}
