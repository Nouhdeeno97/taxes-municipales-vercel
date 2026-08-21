-- ============================================================================
-- Gestion des taxes municipales — jeu de données strictement fictives
-- ============================================================================
-- Usage :
--   1. Ouvrir ce fichier dans Supabase SQL Editor.
--   2. Remplacer uniquement le jeton scrypt$X8lFx_SAiaSnxAdLezJ9CQ$khvsg_un1Xj6WBs-FP3qBtoEXVJDc5U40B_nje5wyfgBvtxbAM9EotbzADzO_ImEjX8XLMl_ojdWNkckzJN3Ng par le hash
--      scrypt privé communiqué séparément. Ne jamais versionner ce remplacement.
--   3. Exécuter l'intégralité du script une ou plusieurs fois.
--
-- Garanties :
--   * aucune instruction DDL, DELETE, TRUNCATE ou ALTER ;
--   * données explicitement préfixées DEMO ;
--   * insertions idempotentes via ON CONFLICT DO NOTHING ;
--   * aucune donnée municipale, personne ou encaissement réel.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_password_hash text := 'scrypt$X8lFx_SAiaSnxAdLezJ9CQ$khvsg_un1Xj6WBs-FP3qBtoEXVJDc5U40B_nje5wyfgBvtxbAM9EotbzADzO_ImEjX8XLMl_ojdWNkckzJN3Ng';
BEGIN
  IF v_password_hash !~ '^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Remplacez scrypt$X8lFx_SAiaSnxAdLezJ9CQ$khvsg_un1Xj6WBs-FP3qBtoEXVJDc5U40B_nje5wyfgBvtxbAM9EotbzADzO_ImEjX8XLMl_ojdWNkckzJN3Ng par le hash scrypt privé de démonstration avant exécution.';
  END IF;
END $$;

-- Identifiants stables réservés exclusivement au scénario de démonstration.
INSERT INTO municipalities (id, code, "name", "platformName", "primaryColor", "appearanceMode", currency, timezone, "isActive")
VALUES ('00000000-0000-4000-8000-000000000001', 'DEMO-VILLE', 'Mairie de Démo-Ville [DEMO]', 'Plateforme fiscale municipale [DEMO]', '#0F5CDB', 'LIGHT', 'XOF', 'Africa/Libreville', true)
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, "municipalityId", code, label, "isSystem", "isActive") VALUES
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'DEMO_ADMIN', 'Administrateur de démonstration', true, true),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'DEMO_AGENT', 'Agent de collecte de démonstration', true, true),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'DEMO_SUPERVISOR', 'Superviseur de démonstration', true, true)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, module, action, label) VALUES
  ('00000000-0000-4000-8000-000000000020', 'dashboard.read', 'dashboard', 'read', 'Consulter le tableau de bord'),
  ('00000000-0000-4000-8000-000000000021', 'users.manage', 'users', 'manage', 'Gérer les utilisateurs'),
  ('00000000-0000-4000-8000-000000000022', 'territories.manage', 'territories', 'manage', 'Gérer les territoires'),
  ('00000000-0000-4000-8000-000000000023', 'taxpayers.manage', 'taxpayers', 'manage', 'Gérer les redevables'),
  ('00000000-0000-4000-8000-000000000024', 'activities.manage', 'activities', 'manage', 'Gérer les activités'),
  ('00000000-0000-4000-8000-000000000025', 'fiscality.manage', 'fiscality', 'manage', 'Gérer la fiscalité'),
  ('00000000-0000-4000-8000-000000000026', 'obligations.manage', 'obligations', 'manage', 'Gérer les obligations'),
  ('00000000-0000-4000-8000-000000000027', 'payments.manage', 'payments', 'manage', 'Enregistrer les encaissements'),
  ('00000000-0000-4000-8000-000000000028', 'receipts.read', 'receipts', 'read', 'Consulter les reçus'),
  ('00000000-0000-4000-8000-000000000029', 'deposits.manage', 'deposits', 'manage', 'Gérer les versements'),
  ('00000000-0000-4000-8000-000000000030', 'reports.read', 'reports', 'read', 'Consulter les rapports')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (id, "roleId", "permissionId") VALUES
  ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000021'),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000022'),
  ('00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000023'),
  ('00000000-0000-4000-8000-000000000044', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000024'),
  ('00000000-0000-4000-8000-000000000045', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000025'),
  ('00000000-0000-4000-8000-000000000046', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000026'),
  ('00000000-0000-4000-8000-000000000047', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000027'),
  ('00000000-0000-4000-8000-000000000048', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000028'),
  ('00000000-0000-4000-8000-000000000049', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000029'),
  ('00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030'),
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000023'),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000024'),
  ('00000000-0000-4000-8000-000000000054', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000027'),
  ('00000000-0000-4000-8000-000000000055', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000028'),
  ('00000000-0000-4000-8000-000000000056', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000057', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000026'),
  ('00000000-0000-4000-8000-000000000058', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000028'),
  ('00000000-0000-4000-8000-000000000059', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000029')
ON CONFLICT DO NOTHING;

INSERT INTO users ("openId", "municipalityId", "name", "loginMethod", "localUsername", "passwordHash", role, "isActive", "mustChangePassword", "lastSignedIn")
VALUES ('local:demo-admin', '00000000-0000-4000-8000-000000000001', 'Administrateur Démo-Ville [DEMO]', 'local-password', 'admin.demo', 'scrypt$X8lFx_SAiaSnxAdLezJ9CQ$khvsg_un1Xj6WBs-FP3qBtoEXVJDc5U40B_nje5wyfgBvtxbAM9EotbzADzO_ImEjX8XLMl_ojdWNkckzJN3Ng', 'admin', true, true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (id, "userId", "roleId", "assignedBy")
SELECT '00000000-0000-4000-8000-000000000060', u.id, '00000000-0000-4000-8000-000000000010', u.id
FROM users u
WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (id, "municipalityId", code, "name", "isActive")
VALUES ('00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-000000000001', 'DEMO-SEC-01', 'Secteur Central [DEMO]', true)
ON CONFLICT DO NOTHING;

INSERT INTO zones (id, "sectorId", code, "name", latitude, longitude, "isActive")
VALUES ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000100', 'DEMO-ZONE-01', 'Zone Pilote [DEMO]', 0.3900000, 9.4500000, true)
ON CONFLICT DO NOTHING;

INSERT INTO markets (id, "zoneId", code, "name", address, "isActive")
VALUES ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101', 'DEMO-MARCHE-01', 'Marché Municipal Fictif [DEMO]', 'Adresse fictive — à ne pas utiliser', true)
ON CONFLICT DO NOTHING;

INSERT INTO market_locations (id, "marketId", code, label, status) VALUES
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000102', 'DEMO-EMP-A01', 'Emplacement fictif A-01 [DEMO]', 'OCCUPIED'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000102', 'DEMO-EMP-B02', 'Emplacement fictif B-02 [DEMO]', 'AVAILABLE')
ON CONFLICT DO NOTHING;

INSERT INTO activity_categories (id, "municipalityId", code, label, "isActive")
VALUES ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000001', 'DEMO-COMMERCE', 'Commerce fictif [DEMO]', true)
ON CONFLICT DO NOTHING;

INSERT INTO activity_types (id, "categoryId", code, label, "isActive") VALUES
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000110', 'DEMO-VENTE', 'Vente fictive [DEMO]', true),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000110', 'DEMO-SERVICE', 'Service fictif [DEMO]', true),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000110', 'DEMO-PUBLICITE', 'Publicité fictive [DEMO]', true)
ON CONFLICT DO NOTHING;

INSERT INTO tax_categories (id, "municipalityId", code, label) VALUES
  ('00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000001', 'DEMO-CAT-MARCHE', 'Redevances de marché fictives [DEMO]'),
  ('00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000001', 'DEMO-CAT-VOIRIE', 'Redevances de voirie fictives [DEMO]'),
  ('00000000-0000-4000-8000-000000000122', '00000000-0000-4000-8000-000000000001', 'DEMO-CAT-PUB', 'Redevances publicitaires fictives [DEMO]')
ON CONFLICT DO NOTHING;

INSERT INTO tax_types (id, "municipalityId", "categoryId", code, label, "isActive") VALUES
  ('00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000120', 'DEMO-TAXE-MARCHE', 'Taxe de marché fictive [DEMO]', true),
  ('00000000-0000-4000-8000-000000000124', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000121', 'DEMO-TAXE-STATIONNEMENT', 'Taxe de stationnement fictive [DEMO]', true),
  ('00000000-0000-4000-8000-000000000125', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000122', 'DEMO-TAXE-PUBLICITE', 'Taxe de publicité fictive [DEMO]', true)
ON CONFLICT DO NOTHING;

INSERT INTO tax_periodicities (id, "municipalityId", code, label, "calendarUnit", "intervalCount", "isActive")
VALUES ('00000000-0000-4000-8000-000000000126', '00000000-0000-4000-8000-000000000001', 'DEMO-MENSUEL', 'Mensuelle fictive [DEMO]', 'MONTH', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods (id, "municipalityId", code, label, "isCash", "isActive")
VALUES ('00000000-0000-4000-8000-000000000127', '00000000-0000-4000-8000-000000000001', 'DEMO-ESPECES', 'Espèces fictives [DEMO]', true, true)
ON CONFLICT DO NOTHING;

INSERT INTO taxpayers (id, "municipalityId", reference, type, "firstName", "lastName", "legalName", "nationalId", "taxId", status, "createdBy") VALUES
  ('00000000-0000-4000-8000-000000000130', '00000000-0000-4000-8000-000000000001', 'DEMO-RED-001', 'PERSON', 'Amalia', 'Fictivia', NULL, 'DEMO-NAT-001', 'DEMO-FISC-001', 'ACTIVE', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000001', 'DEMO-RED-002', 'PERSON', 'Benoît', 'Imaginaire', NULL, 'DEMO-NAT-002', 'DEMO-FISC-002', 'ACTIVE', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000132', '00000000-0000-4000-8000-000000000001', 'DEMO-RED-003', 'COMPANY', NULL, NULL, 'Atelier Exemple SARL [DEMO]', NULL, 'DEMO-FISC-003', 'ACTIVE', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000133', '00000000-0000-4000-8000-000000000001', 'DEMO-RED-004', 'PERSON', 'Clarisse', 'Modélia', NULL, 'DEMO-NAT-004', 'DEMO-FISC-004', 'ACTIVE', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000134', '00000000-0000-4000-8000-000000000001', 'DEMO-RED-005', 'COMPANY', NULL, NULL, 'Services Scénario SA [DEMO]', NULL, 'DEMO-FISC-005', 'ACTIVE', (SELECT id FROM users WHERE "localUsername" = 'admin.demo'))
ON CONFLICT DO NOTHING;

INSERT INTO taxpayer_contacts (id, "taxpayerId", kind, value, "isPrimary") VALUES
  ('00000000-0000-4000-8000-000000000135', '00000000-0000-4000-8000-000000000130', 'PHONE', '+000000001', true),
  ('00000000-0000-4000-8000-000000000136', '00000000-0000-4000-8000-000000000131', 'PHONE', '+000000002', true),
  ('00000000-0000-4000-8000-000000000137', '00000000-0000-4000-8000-000000000132', 'EMAIL', 'atelier.demo.invalid', true),
  ('00000000-0000-4000-8000-000000000138', '00000000-0000-4000-8000-000000000133', 'PHONE', '+000000004', true),
  ('00000000-0000-4000-8000-000000000139', '00000000-0000-4000-8000-000000000134', 'EMAIL', 'services.demo.invalid', true)
ON CONFLICT DO NOTHING;

INSERT INTO activities (id, "municipalityId", reference, "activityTypeId", "currentTaxpayerId", label, "locationType", "zoneId", "marketId", "marketLocationId", address, status, "startedAt", "createdBy") VALUES
  ('00000000-0000-4000-8000-000000000140', '00000000-0000-4000-8000-000000000001', 'DEMO-ACT-001', '00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000130', 'Étal fictif de produits [DEMO]', 'MARKET_LOCATION', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103', 'Marché fictif — emplacement A-01', 'ACTIVE', '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000001', 'DEMO-ACT-002', '00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000132', 'Service fictif de proximité [DEMO]', 'MARKET', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', NULL, 'Marché municipal fictif', 'ACTIVE', '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000142', '00000000-0000-4000-8000-000000000001', 'DEMO-ACT-003', '00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000134', 'Support publicitaire fictif [DEMO]', 'ZONE', '00000000-0000-4000-8000-000000000101', NULL, NULL, 'Zone pilote fictive', 'ACTIVE', '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo'))
ON CONFLICT DO NOTHING;

INSERT INTO activity_ownerships (id, "activityId", "taxpayerId", "isPrimary", "startDate", "transferredBy") VALUES
  ('00000000-0000-4000-8000-000000000143', '00000000-0000-4000-8000-000000000140', '00000000-0000-4000-8000-000000000130', true, '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000144', '00000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000132', true, '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000145', '00000000-0000-4000-8000-000000000142', '00000000-0000-4000-8000-000000000134', true, '2026-01-01T00:00:00+00', (SELECT id FROM users WHERE "localUsername" = 'admin.demo'))
ON CONFLICT DO NOTHING;

INSERT INTO tax_rules (id, "municipalityId", "taxTypeId", "periodicityId", code, label, "baseAmount", "minimumAmount", "graceDays", "penaltyRate", "allowsPartial", "validFrom", priority, "isActive", "createdBy") VALUES
  ('00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000126', 'DEMO-REGLE-MARCHE', 'Barème mensuel de marché fictif [DEMO]', 5000.00, 5000.00, 5, 0.0000, true, '2026-01-01T00:00:00+00', 10, true, (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000151', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000124', '00000000-0000-4000-8000-000000000126', 'DEMO-REGLE-STATIONNEMENT', 'Barème mensuel de stationnement fictif [DEMO]', 3000.00, 3000.00, 5, 0.0000, true, '2026-01-01T00:00:00+00', 10, true, (SELECT id FROM users WHERE "localUsername" = 'admin.demo')),
  ('00000000-0000-4000-8000-000000000152', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000125', '00000000-0000-4000-8000-000000000126', 'DEMO-REGLE-PUBLICITE', 'Barème mensuel de publicité fictif [DEMO]', 7500.00, 7500.00, 5, 0.0000, true, '2026-01-01T00:00:00+00', 10, true, (SELECT id FROM users WHERE "localUsername" = 'admin.demo'))
ON CONFLICT DO NOTHING;

INSERT INTO tax_rule_scopes (id, "taxRuleId", "activityTypeId", "zoneId") VALUES
  ('00000000-0000-4000-8000-000000000153', '00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000154', '00000000-0000-4000-8000-000000000151', '00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000155', '00000000-0000-4000-8000-000000000152', '00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000101')
ON CONFLICT DO NOTHING;

INSERT INTO activity_tax_assignments (id, "activityId", "taxRuleId", "startDate", "isActive") VALUES
  ('00000000-0000-4000-8000-000000000156', '00000000-0000-4000-8000-000000000140', '00000000-0000-4000-8000-000000000150', '2026-01-01T00:00:00+00', true),
  ('00000000-0000-4000-8000-000000000157', '00000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000151', '2026-01-01T00:00:00+00', true),
  ('00000000-0000-4000-8000-000000000158', '00000000-0000-4000-8000-000000000142', '00000000-0000-4000-8000-000000000152', '2026-01-01T00:00:00+00', true)
ON CONFLICT DO NOTHING;

INSERT INTO tax_obligations (id, "municipalityId", reference, "taxpayerId", "activityId", "taxTypeId", "taxRuleId", "periodStart", "periodEnd", "dueDate", "expectedAmount", "penaltyAmount", "discountAmount", "adjustmentAmount", "remainingAmount", status, "generatedAutomatically") VALUES
  ('00000000-0000-4000-8000-000000000160', '00000000-0000-4000-8000-000000000001', 'DEMO-OBL-001', '00000000-0000-4000-8000-000000000130', '00000000-0000-4000-8000-000000000140', '00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000150', '2026-08-01T00:00:00+00', '2026-08-31T23:59:59+00', '2026-08-31T23:59:59+00', 5000.00, 0.00, 0.00, 0.00, 0.00, 'PAID', true),
  ('00000000-0000-4000-8000-000000000161', '00000000-0000-4000-8000-000000000001', 'DEMO-OBL-002', '00000000-0000-4000-8000-000000000132', '00000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000124', '00000000-0000-4000-8000-000000000151', '2026-08-01T00:00:00+00', '2026-08-31T23:59:59+00', '2026-08-31T23:59:59+00', 3000.00, 0.00, 0.00, 0.00, 3000.00, 'PENDING', true)
ON CONFLICT DO NOTHING;

INSERT INTO payment_transactions (id, "municipalityId", reference, "taxpayerId", "collectedBy", "deviceId", "offlineOperationId", "grossAmount", "netAmount", status, "collectedAt", "validatedAt")
SELECT '00000000-0000-4000-8000-000000000170', '00000000-0000-4000-8000-000000000001', 'DEMO-ENC-001', '00000000-0000-4000-8000-000000000130', u.id, 'DEMO-DEVICE-01', 'DEMO-OFFLINE-ENC-001', 5000.00, 5000.00, 'VALIDATED', '2026-08-10T10:15:00+00', '2026-08-10T10:16:00+00'
FROM users u WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

INSERT INTO payment_items (id, "paymentTransactionId", "taxObligationId", amount)
VALUES ('00000000-0000-4000-8000-000000000171', '00000000-0000-4000-8000-000000000170', '00000000-0000-4000-8000-000000000160', 5000.00)
ON CONFLICT DO NOTHING;

INSERT INTO payment_allocations (id, "paymentTransactionId", "paymentMethodId", amount, "externalReference")
VALUES ('00000000-0000-4000-8000-000000000172', '00000000-0000-4000-8000-000000000170', '00000000-0000-4000-8000-000000000127', 5000.00, 'DEMO-CAISSE-001')
ON CONFLICT DO NOTHING;

INSERT INTO receipts (id, "municipalityId", "paymentTransactionId", reference, "qrPayload", "integrityHash", status, "issuedAt", "immutableSnapshot")
VALUES ('00000000-0000-4000-8000-000000000173', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000170', 'DEMO-REC-001', 'demo://receipt/DEMO-REC-001', 'DEMO-INTEGRITY-HASH-001-NOT-FOR-PRODUCTION', 'FINAL', '2026-08-10T10:16:00+00', '{"scenario":"DEMO","notice":"Document fictif non valable","receiptReference":"DEMO-REC-001","paymentReference":"DEMO-ENC-001","amount":5000.00}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO receipt_print_history (id, "receiptId", "printType", "printedBy", "deviceId")
SELECT '00000000-0000-4000-8000-000000000174', '00000000-0000-4000-8000-000000000173', 'ORIGINAL', u.id, 'DEMO-DEVICE-01'
FROM users u WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

INSERT INTO deposits (id, "municipalityId", reference, "agentId", "expectedAmount", "depositedAmount", "differenceAmount", status, "submittedAt", "validatedAt", "validatedBy", observation)
SELECT '00000000-0000-4000-8000-000000000180', '00000000-0000-4000-8000-000000000001', 'DEMO-VERS-001', u.id, 5000.00, 5000.00, 0.00, 'VALIDATED', '2026-08-10T16:00:00+00', '2026-08-10T16:10:00+00', u.id, 'Versement strictement fictif — écart nul [DEMO]'
FROM users u WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

INSERT INTO deposit_items (id, "depositId", "paymentTransactionId", "acceptedAmount", status)
VALUES ('00000000-0000-4000-8000-000000000181', '00000000-0000-4000-8000-000000000180', '00000000-0000-4000-8000-000000000170', 5000.00, 'ACCEPTED')
ON CONFLICT DO NOTHING;

INSERT INTO cash_counts (id, "depositId", "countedAmount", denominations, "countedBy", "countedAt")
SELECT '00000000-0000-4000-8000-000000000182', '00000000-0000-4000-8000-000000000180', 5000.00, '{"DEMO":5000}'::jsonb, u.id, '2026-08-10T16:05:00+00'
FROM users u WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

INSERT INTO daily_closings (id, "municipalityId", "agentId", "businessDate", "expectedAmount", "depositedAmount", "differenceAmount", status, "closedBy", "closedAt")
SELECT '00000000-0000-4000-8000-000000000183', '00000000-0000-4000-8000-000000000001', u.id, '2026-08-10T00:00:00+00', 5000.00, 5000.00, 0.00, 'CLOSED', u.id, '2026-08-10T17:00:00+00'
FROM users u WHERE u."localUsername" = 'admin.demo'
ON CONFLICT DO NOTHING;

COMMIT;

-- Contrôles post-exécution : ces requêtes sont en lecture seule.
SELECT
  (SELECT count(*) FROM taxpayers WHERE "municipalityId" = '00000000-0000-4000-8000-000000000001') AS demo_redevables,
  (SELECT count(*) FROM activities WHERE "municipalityId" = '00000000-0000-4000-8000-000000000001') AS demo_activites,
  (SELECT count(*) FROM tax_obligations WHERE "municipalityId" = '00000000-0000-4000-8000-000000000001') AS demo_obligations,
  (SELECT count(*) FROM payment_transactions WHERE "municipalityId" = '00000000-0000-4000-8000-000000000001') AS demo_encaissements,
  (SELECT count(*) FROM receipts WHERE "municipalityId" = '00000000-0000-4000-8000-000000000001') AS demo_recus;
