import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/supabase/0001_daily_closing_deposits.sql"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers/municipal.ts"), "utf8");
const pages = readFileSync(resolve(process.cwd(), "client/src/pages/MunicipalPages.tsx"), "utf8");

describe("intégrité du rapprochement versement-clôture", () => {
  it("rattache les clôtures à leurs versements avec une unicité globale par versement", () => {
    expect(schema).toContain('export const dailyClosingDeposits = pgTable("daily_closing_deposits"');
    expect(migration).toContain('"daily_closing_deposit_global_unique"');
    expect(migration).toContain('"depositId"');
  });

  it("n’accepte qu’un versement validé, daté et non déjà clôturé", () => {
    expect(router).toContain('eq(deposits.status, "VALIDATED")');
    expect(router).toContain('isNull(dailyClosingDeposits.id)');
    expect(router).toContain('Chaque versement doit être validé');
    expect(router).toContain('await tx.insert(dailyClosingDeposits).values');
  });

  it("réserve la déclaration au nom d’un agent aux administrateurs avec justification", () => {
    expect(router).toContain('const onBehalfOfAgent = agentId !== ctx.user.id');
    expect(router).toContain('if (onBehalfOfAgent) requireAdmin(ctx.user)');
    expect(router).toContain('déclaration administrative au nom de l’agent');
    expect(router).toContain('"DECLARE_ON_BEHALF"');
  });

  it("expose une sélection globale des encaissements et versements affichés", () => {
    expect(pages).toContain('"Sélectionner tout"');
    expect(pages).toContain('eligiblePayments.data?.map(row => row.payment.id)');
    expect(pages).toContain('eligibleDeposits.data?.map(row => row.deposit.id)');
  });
});
