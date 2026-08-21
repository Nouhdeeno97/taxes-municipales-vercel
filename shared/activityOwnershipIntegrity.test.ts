import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(resolve(process.cwd(), "drizzle/supabase/0000_lean_dakota_north.sql"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers/municipal.ts"), "utf8");

describe("intégrité des propriétés d’activité", () => {
  it("reconnaît que la migration Supabase exige un identifiant primaire explicite", () => {
    expect(migrationSql).toContain('CREATE TABLE "activity_ownerships"');
    expect(migrationSql).toContain('"id" varchar(36) PRIMARY KEY NOT NULL');
  });

  it("génère un UUID pour chaque création, transfert ou synchronisation de propriété", () => {
    const ownershipInserts = [...routerSource.matchAll(/insert\(activityOwnerships\)\.values\((\{[^\n]+\})\)/g)].map(match => match[1]);

    expect(ownershipInserts).toHaveLength(3);
    for (const payload of ownershipInserts) {
      expect(payload).toContain("id: randomUUID()");
      expect(payload).toContain("activityId:");
      expect(payload).toContain("taxpayerId:");
    }
  });
});
