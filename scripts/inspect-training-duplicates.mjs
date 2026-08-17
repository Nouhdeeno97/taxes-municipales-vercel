import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [taxpayers] = await connection.query("SELECT reference, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY createdAt SEPARATOR ',') AS ids FROM taxpayers WHERE municipalityId = ? AND reference = 'FORM-LBV-RED-001' GROUP BY reference", [municipalityId]);
  const [activities] = await connection.query("SELECT reference, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY createdAt SEPARATOR ',') AS ids FROM activities WHERE municipalityId = ? AND reference = 'FORM-LBV-ACT-001' GROUP BY reference", [municipalityId]);
  const [obligations] = await connection.query("SELECT reference, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY createdAt SEPARATOR ',') AS ids FROM tax_obligations WHERE municipalityId = ? AND reference = 'FORM-LBV-OBL-001' GROUP BY reference", [municipalityId]);
  const [payments] = await connection.query("SELECT reference, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY createdAt SEPARATOR ',') AS ids FROM payment_transactions WHERE municipalityId = ? AND reference = 'FORM-LBV-PAY-001' GROUP BY reference", [municipalityId]);
  const [receipts] = await connection.query("SELECT reference, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY createdAt SEPARATOR ',') AS ids FROM receipts WHERE municipalityId = ? AND reference = 'FORM-LBV-REC-001' GROUP BY reference", [municipalityId]);
  await fs.writeFile("/home/ubuntu/diagnostics/inspect-training-duplicates.json", JSON.stringify({ taxpayers, activities, obligations, payments, receipts }, null, 2));
} finally {
  connection.destroy();
}
