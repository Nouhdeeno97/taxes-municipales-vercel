import { createHash, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const marketId = "20000000-0000-4000-8000-000000000303";
const activityTypeId = "20000000-0000-4000-8000-000000000411";
const taxTypeId = "20000000-0000-4000-8000-000000000511";
const taxRuleId = "20000000-0000-4000-8000-000000000801";
const paymentMethodId = "20000000-0000-4000-8000-000000000601";
const businessDate = "2026-08-17 00:00:00";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function one(sql, params) {
  const [rows] = await connection.query(sql, params);
  return rows[0];
}

async function ensureId({ selectSql, selectParams, insertSql, insertParams, label }) {
  const existing = await one(selectSql, selectParams);
  if (existing?.id) return existing.id;
  await connection.query(insertSql, insertParams);
  const inserted = await one(selectSql, selectParams);
  if (!inserted?.id) throw new Error(`Création impossible : ${label}`);
  return inserted.id;
}

async function ensureSimple({ existsSql, existsParams, insertSql, insertParams }) {
  if (await one(existsSql, existsParams)) return;
  await connection.query(insertSql, insertParams);
}

try {
  await connection.beginTransaction();

  const taxpayer = await one("SELECT id FROM taxpayers WHERE municipalityId = ? AND reference = ?", [municipalityId, "FORM-LBV-RED-001"]);
  const user = await one("SELECT id FROM users WHERE municipalityId = ? AND isActive = TRUE ORDER BY id LIMIT 1", [municipalityId]);
  if (!taxpayer?.id || !user?.id) throw new Error("Le redevable ou le compte administrateur de formation est introuvable.");

  const locationId = await ensureId({
    label: "emplacement de formation",
    selectSql: "SELECT id FROM market_locations WHERE marketId = ? AND code = ?",
    selectParams: [marketId, "MB-FORM-01"],
    insertSql: "INSERT INTO market_locations (id, marketId, code, label, status) VALUES (?, ?, ?, ?, ?)",
    insertParams: [randomUUID(), marketId, "MB-FORM-01", "FORMATION — NE PAS UTILISER POUR COLLECTE RÉELLE", "OCCUPIED"],
  });

  const activityId = await ensureId({
    label: "activité de formation",
    selectSql: "SELECT id FROM activities WHERE municipalityId = ? AND reference = ?",
    selectParams: [municipalityId, "FORM-LBV-ACT-001"],
    insertSql: "INSERT INTO activities (id, municipalityId, reference, activityTypeId, currentTaxpayerId, label, locationType, marketId, marketLocationId, status, startedAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)",
    insertParams: [randomUUID(), municipalityId, "FORM-LBV-ACT-001", activityTypeId, taxpayer.id, "FORMATION — Étal de vivres (non opérationnel)", "MARKET_LOCATION", marketId, locationId, "ACTIVE", user.id],
  });

  await ensureSimple({
    existsSql: "SELECT id FROM activity_ownerships WHERE activityId = ? AND taxpayerId = ? AND endDate IS NULL LIMIT 1",
    existsParams: [activityId, taxpayer.id],
    insertSql: "INSERT INTO activity_ownerships (id, activityId, taxpayerId, isPrimary, startDate, transferredBy) VALUES (?, ?, ?, TRUE, NOW(), ?)",
    insertParams: [randomUUID(), activityId, taxpayer.id, user.id],
  });
  await ensureSimple({
    existsSql: "SELECT id FROM activity_tax_assignments WHERE activityId = ? AND taxRuleId = ? AND isActive = TRUE LIMIT 1",
    existsParams: [activityId, taxRuleId],
    insertSql: "INSERT INTO activity_tax_assignments (id, activityId, taxRuleId, startDate, isActive) VALUES (?, ?, ?, NOW(), TRUE)",
    insertParams: [randomUUID(), activityId, taxRuleId],
  });

  const obligationId = await ensureId({
    label: "obligation de formation",
    selectSql: "SELECT id FROM tax_obligations WHERE municipalityId = ? AND reference = ?",
    selectParams: [municipalityId, "FORM-LBV-OBL-001"],
    insertSql: "INSERT INTO tax_obligations (id, municipalityId, reference, taxpayerId, activityId, taxTypeId, taxRuleId, periodStart, periodEnd, dueDate, expectedAmount, remainingAmount, status, generatedAutomatically) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), 1000.00, 1000.00, 'PENDING', TRUE)",
    insertParams: [randomUUID(), municipalityId, "FORM-LBV-OBL-001", taxpayer.id, activityId, taxTypeId, taxRuleId],
  });

  const paymentId = await ensureId({
    label: "encaissement de formation",
    selectSql: "SELECT id FROM payment_transactions WHERE municipalityId = ? AND reference = ?",
    selectParams: [municipalityId, "FORM-LBV-PAY-001"],
    insertSql: "INSERT INTO payment_transactions (id, municipalityId, reference, taxpayerId, collectedBy, deviceId, offlineOperationId, grossAmount, netAmount, status, collectedAt, validatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1000.00, 1000.00, 'VALIDATED', NOW(), NOW())",
    insertParams: [randomUUID(), municipalityId, "FORM-LBV-PAY-001", taxpayer.id, user.id, "FORMATION-LBV-DEVICE", "formation-lbv-payment-001"],
  });

  await ensureSimple({
    existsSql: "SELECT id FROM payment_items WHERE paymentTransactionId = ? AND taxObligationId = ?",
    existsParams: [paymentId, obligationId],
    insertSql: "INSERT INTO payment_items (id, paymentTransactionId, taxObligationId, amount) VALUES (?, ?, ?, 1000.00)",
    insertParams: [randomUUID(), paymentId, obligationId],
  });
  await ensureSimple({
    existsSql: "SELECT id FROM payment_allocations WHERE paymentTransactionId = ? AND paymentMethodId = ? AND externalReference = ? LIMIT 1",
    existsParams: [paymentId, paymentMethodId, "FORMATION-LBV-001"],
    insertSql: "INSERT INTO payment_allocations (id, paymentTransactionId, paymentMethodId, amount, externalReference) VALUES (?, ?, ?, 1000.00, ?)",
    insertParams: [randomUUID(), paymentId, paymentMethodId, "FORMATION-LBV-001"],
  });
  await connection.query("UPDATE tax_obligations SET remainingAmount = 0.00, status = 'PAID' WHERE id = ?", [obligationId]);

  const integrityHash = createHash("sha256").update(`FORMATION|LBV|FORM-LBV-REC-001|${paymentId}|1000.00`).digest("hex");
  const receiptId = await ensureId({
    label: "reçu de formation",
    selectSql: "SELECT id FROM receipts WHERE municipalityId = ? AND reference = ?",
    selectParams: [municipalityId, "FORM-LBV-REC-001"],
    insertSql: "INSERT INTO receipts (id, municipalityId, paymentTransactionId, reference, qrPayload, integrityHash, status, issuedAt, immutableSnapshot) VALUES (?, ?, ?, ?, ?, ?, 'FINAL', NOW(), ?)",
    insertParams: [randomUUID(), municipalityId, paymentId, "FORM-LBV-REC-001", `TAXMUN:FORMATION:FORM-LBV-REC-001:${integrityHash}`, integrityHash, JSON.stringify({ training: true, notice: "SCÉNARIO DE FORMATION — NON OPÉRATIONNEL", paymentReference: "FORM-LBV-PAY-001", amount: 1000 })],
  });
  await ensureSimple({
    existsSql: "SELECT id FROM receipt_print_history WHERE receiptId = ? AND printType = 'ORIGINAL' LIMIT 1",
    existsParams: [receiptId],
    insertSql: "INSERT INTO receipt_print_history (id, receiptId, printType, printedBy, deviceId) VALUES (?, ?, 'ORIGINAL', ?, ?)",
    insertParams: [randomUUID(), receiptId, user.id, "FORMATION-LBV-DEVICE"],
  });

  const depositId = await ensureId({
    label: "versement de formation",
    selectSql: "SELECT id FROM deposits WHERE municipalityId = ? AND reference = ?",
    selectParams: [municipalityId, "FORM-LBV-DEP-001"],
    insertSql: "INSERT INTO deposits (id, municipalityId, reference, agentId, expectedAmount, depositedAmount, differenceAmount, status, submittedAt, validatedAt, validatedBy, observation) VALUES (?, ?, ?, ?, 1000.00, 1000.00, 0.00, 'VALIDATED', NOW(), NOW(), ?, ?)",
    insertParams: [randomUUID(), municipalityId, "FORM-LBV-DEP-001", user.id, user.id, "SCÉNARIO DE FORMATION — NON OPÉRATIONNEL"],
  });
  await ensureSimple({
    existsSql: "SELECT id FROM deposit_items WHERE depositId = ? AND paymentTransactionId = ?",
    existsParams: [depositId, paymentId],
    insertSql: "INSERT INTO deposit_items (id, depositId, paymentTransactionId, acceptedAmount, status) VALUES (?, ?, ?, 1000.00, 'ACCEPTED')",
    insertParams: [randomUUID(), depositId, paymentId],
  });
  await ensureId({
    label: "comptage de caisse de formation",
    selectSql: "SELECT id FROM cash_counts WHERE depositId = ?",
    selectParams: [depositId],
    insertSql: "INSERT INTO cash_counts (id, depositId, countedAmount, denominations, countedBy) VALUES (?, ?, 1000.00, ?, ?)",
    insertParams: [randomUUID(), depositId, JSON.stringify({ 1000: 1 }), user.id],
  });
  await ensureId({
    label: "clôture de formation",
    selectSql: "SELECT id FROM daily_closings WHERE municipalityId = ? AND agentId = ? AND businessDate = ?",
    selectParams: [municipalityId, user.id, businessDate],
    insertSql: "INSERT INTO daily_closings (id, municipalityId, agentId, businessDate, expectedAmount, depositedAmount, differenceAmount, status, closedBy, closedAt) VALUES (?, ?, ?, ?, 1000.00, 1000.00, 0.00, 'CLOSED', ?, NOW())",
    insertParams: [randomUUID(), municipalityId, user.id, businessDate, user.id],
  });
  await ensureSimple({
    existsSql: "SELECT id FROM audit_logs WHERE municipalityId = ? AND entityType = ? AND entityId = ? LIMIT 1",
    existsParams: [municipalityId, "trainingScenario", "FORM-LBV-001"],
    insertSql: "INSERT INTO audit_logs (id, municipalityId, actorId, action, module, entityType, entityId, afterValue, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    insertParams: [randomUUID(), municipalityId, user.id, "CREATE_TRAINING_SCENARIO", "formation", "trainingScenario", "FORM-LBV-001", JSON.stringify({ notice: "SCÉNARIO DE FORMATION — NON OPÉRATIONNEL", taxpayerReference: "FORM-LBV-RED-001", activityReference: "FORM-LBV-ACT-001", obligationReference: "FORM-LBV-OBL-001", paymentReference: "FORM-LBV-PAY-001", receiptReference: "FORM-LBV-REC-001", depositReference: "FORM-LBV-DEP-001" }), "FORMATION-LBV-DEVICE"],
  });

  await connection.commit();
  console.log("Scénario de formation Libreville complété de manière atomique.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.destroy();
}
