import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [categories] = await connection.query("SELECT id, code, label, isActive FROM activity_categories WHERE municipalityId = ?", [municipalityId]);
  const [types] = await connection.query("SELECT id, categoryId, code, label, isActive FROM activity_types");
  const [territory] = await connection.query("SELECT s.code AS sectorCode, z.code AS zoneCode, mk.code AS marketCode, mk.id AS marketId FROM sectors s LEFT JOIN zones z ON z.sectorId = s.id LEFT JOIN markets mk ON mk.zoneId = z.id WHERE s.municipalityId = ?", [municipalityId]);
  const [rules] = await connection.query("SELECT id, code, taxTypeId, baseAmount, isActive FROM tax_rules WHERE municipalityId = ?", [municipalityId]);
  const [methods] = await connection.query("SELECT id, code, isActive FROM payment_methods WHERE municipalityId = ?", [municipalityId]);
  await fs.writeFile("/home/ubuntu/diagnostics/inspect-libreville-reference.json", JSON.stringify({ categories, types, territory, rules, methods }, null, 2));
} finally {
  connection.destroy();
}
