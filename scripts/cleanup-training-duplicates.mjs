import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const reference = "FORM-LBV-RED-001";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function one(sql, params) {
  const [rows] = await connection.query(sql, params);
  return rows[0];
}

try {
  await connection.beginTransaction();
  const activity = await one("SELECT currentTaxpayerId FROM activities WHERE municipalityId = ? AND reference = ?", [municipalityId, "FORM-LBV-ACT-001"]);
  const actor = await one("SELECT id FROM users WHERE municipalityId = ? AND isActive = TRUE ORDER BY id LIMIT 1", [municipalityId]);
  if (!activity?.currentTaxpayerId || !actor?.id) throw new Error("Impossible d’identifier le redevable de formation à conserver.");

  const [candidates] = await connection.query("SELECT id FROM taxpayers WHERE municipalityId = ? AND reference = ? AND id <> ?", [municipalityId, reference, activity.currentTaxpayerId]);
  for (const candidate of candidates) {
    const dependency = await one(`
      SELECT
        (SELECT COUNT(*) FROM activities WHERE currentTaxpayerId = ?) AS activityCount,
        (SELECT COUNT(*) FROM activity_ownerships WHERE taxpayerId = ?) AS ownershipCount,
        (SELECT COUNT(*) FROM tax_obligations WHERE taxpayerId = ?) AS obligationCount,
        (SELECT COUNT(*) FROM payment_transactions WHERE taxpayerId = ?) AS paymentCount
    `, [candidate.id, candidate.id, candidate.id, candidate.id]);
    if (Number(dependency.activityCount) || Number(dependency.ownershipCount) || Number(dependency.obligationCount) || Number(dependency.paymentCount)) {
      throw new Error(`Le doublon ${candidate.id} est référencé et ne peut pas être supprimé automatiquement.`);
    }
  }

  for (const candidate of candidates) {
    await connection.query("DELETE FROM taxpayers WHERE id = ? AND municipalityId = ? AND reference = ?", [candidate.id, municipalityId, reference]);
  }

  if (candidates.length) {
    await connection.query("INSERT INTO audit_logs (id, municipalityId, actorId, action, module, entityType, entityId, afterValue, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      randomUUID(),
      municipalityId,
      actor.id,
      "CLEANUP_DUPLICATE_TRAINING_TAXPAYERS",
      "formation",
      "trainingScenario",
      "FORM-LBV-001",
      JSON.stringify({ notice: "SCÉNARIO DE FORMATION — NON OPÉRATIONNEL", retainedTaxpayerId: activity.currentTaxpayerId, deletedDuplicateCount: candidates.length }),
      "FORMATION-LBV-DEVICE",
    ]);
  }

  await connection.commit();
  console.log(`Nettoyage terminé : ${candidates.length} doublon(s) de formation supprimé(s), redevable conservé : ${activity.currentTaxpayerId}.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.destroy();
}
