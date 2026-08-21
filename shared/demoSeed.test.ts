import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const seedPath = resolve(process.cwd(), "scripts/demo-seed.sql");
const migrationPath = resolve(process.cwd(), "drizzle/supabase/0000_lean_dakota_north.sql");
const seedSql = readFileSync(seedPath, "utf8");
const migrationSql = readFileSync(migrationPath, "utf8");
const executableSql = seedSql.replace(/^--.*$/gm, "");

function migrationColumns(table: string) {
  const tableMatch = migrationSql.match(new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\n\\);`));
  if (!tableMatch) throw new Error(`La table ${table} est absente de la migration Supabase.`);
  return new Set(
    tableMatch[1]
      .split("\n")
      .map(line => line.match(/^\s*"([^"]+)"\s/)?.[1])
      .filter((column): column is string => Boolean(column)),
  );
}

function seedInsertions() {
  return [...seedSql.matchAll(/INSERT INTO ([a-z_]+) \(([\s\S]*?)\)\s*(?:VALUES|SELECT)/g)].map(([, table, rawColumns]) => ({
    table,
    columns: rawColumns.split(",").map(column => column.trim().replace(/^"|"$/g, "")),
  }));
}

describe("script Supabase de démonstration", () => {
  it("reste strictement idempotent et ne modifie jamais le schéma", () => {
    expect(seedSql).toContain("ON CONFLICT DO NOTHING");
    expect(executableSql).not.toMatch(/\b(?:DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
    expect(seedSql).toContain("BEGIN;");
    expect(seedSql).toContain("COMMIT;");
  });

  it("réutilise le même hash scrypt demandé sans publier de mot de passe en clair", () => {
    const hashes = seedSql.match(/scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+/g) ?? [];
    expect(hashes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(hashes)).toHaveLength(1);
    expect(seedSql).not.toContain("__DEMO_ADMIN_PASSWORD_HASH__");
    expect(seedSql).toContain("'admin.demo'");
  });

  it("couvre les relations du parcours municipal fictif", () => {
    for (const table of [
      "municipalities", "sectors", "zones", "markets", "market_locations",
      "taxpayers", "activities", "tax_rules", "tax_obligations",
      "payment_transactions", "receipts", "deposits", "daily_closings",
    ]) {
      expect(seedSql).toContain(`INSERT INTO ${table}`);
    }
    expect(seedSql).toContain("'DEMO-REC-001'");
    expect(seedSql).toContain("'DEMO-VERS-001'");
  });

  it("n’insère que des colonnes réellement créées par la migration Supabase", () => {
    const insertions = seedInsertions();
    expect(insertions.length).toBeGreaterThan(0);

    for (const { table, columns } of insertions) {
      const columnsInMigration = migrationColumns(table);
      for (const column of columns) {
        expect(columnsInMigration, `${table}.${column} doit exister dans la migration`).toContain(column);
      }
    }
  });
});
