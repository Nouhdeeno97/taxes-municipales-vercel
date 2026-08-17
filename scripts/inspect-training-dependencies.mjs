import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [activity] = await connection.query("SELECT id, currentTaxpayerId FROM activities WHERE municipalityId = ? AND reference = 'FORM-LBV-ACT-001'", [municipalityId]);
  const [referencedTaxpayers] = await connection.query(`
    SELECT DISTINCT taxpayerId AS id FROM tax_obligations WHERE municipalityId = ? AND reference = 'FORM-LBV-OBL-001'
    UNION
    SELECT DISTINCT taxpayerId AS id FROM payment_transactions WHERE municipalityId = ? AND reference = 'FORM-LBV-PAY-001'
  `, [municipalityId, municipalityId]);
  const [duplicateDependencies] = await connection.query(`
    SELECT t.id,
      (SELECT COUNT(*) FROM activities a WHERE a.currentTaxpayerId = t.id) AS activityCount,
      (SELECT COUNT(*) FROM activity_ownerships ao WHERE ao.taxpayerId = t.id) AS ownershipCount,
      (SELECT COUNT(*) FROM tax_obligations o WHERE o.taxpayerId = t.id) AS obligationCount,
      (SELECT COUNT(*) FROM payment_transactions p WHERE p.taxpayerId = t.id) AS paymentCount
    FROM taxpayers t
    WHERE t.municipalityId = ? AND t.reference = 'FORM-LBV-RED-001'
    ORDER BY t.createdAt ASC
  `, [municipalityId]);
  await fs.writeFile("/home/ubuntu/diagnostics/inspect-training-dependencies.json", JSON.stringify({ activity, referencedTaxpayers, duplicateDependencies }, null, 2));
} finally {
  connection.destroy();
}
