import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const seedPath = resolve(process.cwd(), "scripts/demo-seed.sql");
const seedSql = readFileSync(seedPath, "utf8");
const executableSql = seedSql.replace(/^--.*$/gm, "");

describe("script Supabase de démonstration", () => {
  it("reste strictement idempotent et ne modifie jamais le schéma", () => {
    expect(seedSql).toContain("ON CONFLICT DO NOTHING");
    expect(executableSql).not.toMatch(/\b(?:DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
    expect(seedSql).toContain("BEGIN;");
    expect(seedSql).toContain("COMMIT;");
  });

  it("ne publie aucun mot de passe ou hash de démonstration", () => {
    expect(seedSql).toContain("__DEMO_ADMIN_PASSWORD_HASH__");
    expect(seedSql).not.toMatch(/scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+/);
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
});
