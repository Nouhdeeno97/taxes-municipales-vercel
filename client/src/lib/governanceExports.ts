import { buildCsvContent, type ExportColumn, type ExportRow } from "@shared/exportFormat";
import { jsPDF } from "jspdf";

export type { ExportColumn, ExportRow };

export function exportGovernanceCsv(filename: string, columns: ExportColumn[], rows: ExportRow[]) {
  const content = buildCsvContent(columns, rows);
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportGovernancePdf(filename: string, title: string, columns: ExportColumn[], rows: ExportRow[]) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const width = 297 - margin * 2;
  const columnWidth = width / Math.max(columns.length, 1);
  let y = 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(title, margin, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Export du ${new Date().toLocaleString("fr-FR")}`, margin, y);
  y += 8;
  const header = () => {
    pdf.setFont("helvetica", "bold");
    columns.forEach((column, index) => pdf.text(column.label.slice(0, 24), margin + index * columnWidth, y, { maxWidth: columnWidth - 2 }));
    y += 6;
    pdf.setFont("helvetica", "normal");
  };
  header();
  rows.forEach(row => {
    if (y > 190) { pdf.addPage(); y = 16; header(); }
    columns.forEach((column, index) => pdf.text(String(row[column.key] ?? "—").slice(0, 42), margin + index * columnWidth, y, { maxWidth: columnWidth - 2 }));
    y += 6;
  });
  pdf.save(`${filename}.pdf`);
}

export const USER_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Utilisateur" },
  { key: "access", label: "Mode d’accès" },
  { key: "roles", label: "Rôles" },
  { key: "status", label: "État" },
  { key: "lastSignedIn", label: "Dernière connexion" },
];

export const AUDIT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "createdAt", label: "Date et heure" },
  { key: "actor", label: "Auteur" },
  { key: "module", label: "Module" },
  { key: "action", label: "Action" },
  { key: "entity", label: "Objet" },
];

export function userExportRows(rows: Array<{ name: string | null; email: string | null; localUsername: string | null; accessMode: string; roles: string | null; isActive: boolean; archivedAt: Date | string | null; lastSignedIn: Date | string | null }>): ExportRow[] {
  return rows.map(row => ({
    name: row.name || row.localUsername || row.email || "Sans nom",
    access: row.accessMode,
    roles: row.roles || "Aucun rôle municipal",
    status: row.archivedAt ? "Archivé" : row.isActive ? "Actif" : "Désactivé",
    lastSignedIn: row.lastSignedIn ? new Date(row.lastSignedIn).toLocaleString("fr-FR") : "Jamais",
  }));
}

export function auditExportRows(rows: Array<{ createdAt: Date | string; actorName: string | null; actorUsername: string | null; actorId: number | null; module: string; action: string; entityType: string; entityId: string }>): ExportRow[] {
  return rows.map(row => ({
    createdAt: new Date(row.createdAt).toLocaleString("fr-FR"),
    actor: row.actorName || row.actorUsername || (row.actorId ? `Utilisateur #${row.actorId}` : "Système / compte supprimé"),
    module: row.module,
    action: row.action,
    entity: `${row.entityType} · ${row.entityId}`,
  }));
}
