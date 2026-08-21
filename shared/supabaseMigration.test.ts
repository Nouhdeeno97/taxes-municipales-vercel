import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const schemaPath = resolve(projectRoot, "drizzle/schema.ts");
const migrationsDirectory = resolve(projectRoot, "drizzle/supabase");

function readInitialMigration() {
  const migrationFile = readdirSync(migrationsDirectory)
    .filter((file) => /^0000_.*\.sql$/.test(file))
    .sort()[0];

  if (!migrationFile) {
    throw new Error("La migration initiale Supabase est introuvable.");
  }

  return readFileSync(resolve(migrationsDirectory, migrationFile), "utf8");
}

describe("migration PostgreSQL Supabase initiale", () => {
  it("crée chaque enum du schéma avant les tables qui l’utilisent", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const migration = readInitialMigration();
    const firstTablePosition = migration.indexOf("CREATE TABLE");
    const enumNames = [...schema.matchAll(/pgEnum\("([a-z_]+)"/g)].map((match) => match[1]);

    expect(enumNames.length).toBeGreaterThan(0);
    expect(new Set(enumNames).size).toBe(enumNames.length);

    for (const enumName of enumNames) {
      const enumPosition = migration.indexOf(`CREATE TYPE "public"."${enumName}" AS ENUM`);
      expect(enumPosition, `Enum absent de la migration : ${enumName}`).toBeGreaterThanOrEqual(0);
      expect(enumPosition, `Enum créé trop tard : ${enumName}`).toBeLessThan(firstTablePosition);
    }
  });

  it("ajoute les clés étrangères après la création de toutes les tables", () => {
    const migration = readInitialMigration();
    const lastTablePosition = migration.lastIndexOf("CREATE TABLE");
    const firstForeignKeyPosition = migration.indexOf("ALTER TABLE");

    expect(lastTablePosition).toBeGreaterThanOrEqual(0);
    expect(firstForeignKeyPosition).toBeGreaterThan(lastTablePosition);
  });
});
