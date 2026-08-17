import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAccess, requireDb } = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  requireDb: vi.fn(),
}));

vi.mock("./access", () => ({
  requireAccess,
  requireTerritoryAccess: vi.fn(),
}));

vi.mock("./db", () => ({ requireDb }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { auditLogs, syncConflicts, syncOperations } from "../drizzle/schema";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const conflictId = "30000000-0000-4000-8000-000000000001";
const operationId = "40000000-0000-4000-8000-000000000001";

type Captured = { conflictUpdate?: Record<string, unknown>; operationUpdate?: Record<string, unknown>; audit?: Record<string, unknown> };

function makeDb(captured: Captured) {
  const record = {
    conflict: { id: conflictId, resolution: "PENDING" },
    operation: { id: operationId, deviceId: "terrain-lbv-01" },
  };
  const tx = {
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          if (!captured.conflictUpdate) captured.conflictUpdate = values;
          else captured.operationUpdate = values;
          return Promise.resolve();
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        captured.audit = values;
        return Promise.resolve();
      }),
    })),
  };

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([record])) })),
        })),
      })),
    })),
    transaction: vi.fn((callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
  };
}

function makeContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "administrateur-lbv",
      municipalityId,
      email: "admin@libreville.ga",
      name: "Administrateur Libreville",
      loginMethod: "manus",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("municipal.sync.resolveConflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAccess.mockResolvedValue(municipalityId);
  });

  it.each([
    ["SERVER", "SYNCED", "ACKNOWLEDGE"],
    ["LOCAL", "SYNCED", "ACKNOWLEDGE"],
    ["MANUAL", "FAILED", "RETAIN"],
  ] as const)("persists %s with the expected queue decision and audit log", async (resolution, status, queueAction) => {
    const captured: Captured = {};
    requireDb.mockResolvedValue(makeDb(captured));

    const caller = appRouter.createCaller(makeContext());
    const result = await caller.municipal.sync.resolveConflict({ conflictId, resolution });

    expect(result).toEqual({ success: true, resolution, localQueueAction: queueAction });
    expect(captured.conflictUpdate).toMatchObject({ resolution, resolvedBy: 7 });
    expect(captured.operationUpdate).toMatchObject({ status, result: expect.objectContaining({ resolution, localQueueAction: queueAction }) });
    expect(captured.audit).toMatchObject({
      municipalityId,
      actorId: 7,
      action: "RESOLVE_CONFLICT",
      module: "synchronization",
      entityType: "sync_conflict",
      entityId: conflictId,
      deviceId: "terrain-lbv-01",
    });
  });
});

type SyncRecord = { id: string; payloadHash: string; status: string; result?: unknown };
type SyncFlowState = { operations: SyncRecord[]; conflicts: Record<string, unknown>[]; audits: Record<string, unknown>[] };

function makeRegisterDb(state: SyncFlowState) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(state.operations.slice(0, 1))) })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        if (table === syncOperations) state.operations.push(values as unknown as SyncRecord);
        if (table === syncConflicts) state.conflicts.push(values);
        if (table === auditLogs) state.audits.push(values);
        return Promise.resolve();
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          state.operations[0] = { ...state.operations[0], ...values };
          return Promise.resolve();
        }),
      })),
    })),
  };
}

describe("municipal.sync.register", () => {
  const input = {
    deviceId: "terrain-lbv-01",
    operationId: "operation-lbv-001",
    entityType: "payment",
    entityId: "payment-lbv-001",
    operation: "CREATE" as const,
    payloadHash: "a".repeat(64),
    payload: { amount: 1000, source: "offline" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireAccess.mockResolvedValue(municipalityId);
  });

  it("creates once, acknowledges an identical replay, and journals a divergent replay as a conflict", async () => {
    const state: SyncFlowState = { operations: [], conflicts: [], audits: [] };
    requireDb.mockResolvedValue(makeRegisterDb(state));
    const caller = appRouter.createCaller(makeContext());

    const first = await caller.municipal.sync.register(input);
    expect(first).toMatchObject({ status: "SYNCED", idempotent: false });
    expect(state.operations).toHaveLength(1);
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({ action: "SYNC", module: "synchronization", municipalityId });

    const replay = await caller.municipal.sync.register(input);
    expect(replay).toEqual({ status: "SYNCED", idempotent: true });
    expect(state.operations).toHaveLength(1);
    expect(state.conflicts).toHaveLength(0);

    await expect(caller.municipal.sync.register({ ...input, payloadHash: "b".repeat(64), payload: { amount: 1200, source: "offline" } }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.conflicts).toHaveLength(1);
    expect(state.conflicts[0]).toMatchObject({ syncOperationId: first.id, localPayload: { amount: 1200, source: "offline" } });
    expect(state.operations[0]).toMatchObject({ status: "CONFLICT" });
  });
});

function makeEndToEndSyncDb(state: SyncFlowState) {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(state.operations.slice(0, 1))) })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(state.conflicts.length ? [{
              conflict: state.conflicts[0],
              operation: state.operations[0],
            }] : [])),
          })),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        if (table === syncOperations) state.operations.push(values as unknown as SyncRecord);
        if (table === syncConflicts) state.conflicts.push({ ...values, resolution: "PENDING" });
        if (table === auditLogs) state.audits.push(values);
        return Promise.resolve();
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          if (table === syncOperations) state.operations[0] = { ...state.operations[0], ...values };
          if (table === syncConflicts) state.conflicts[0] = { ...state.conflicts[0], ...values };
          return Promise.resolve();
        }),
      })),
    })),
    transaction: vi.fn(async (callback: (transaction: typeof db) => Promise<void>) => callback(db)),
  };
  return db;
}

describe("municipal.sync end-to-end conflict lifecycle", () => {
  const input = {
    deviceId: "terrain-lbv-02",
    operationId: "operation-lbv-002",
    entityType: "payment",
    entityId: "payment-lbv-002",
    operation: "CREATE" as const,
    payloadHash: "c".repeat(64),
    payload: { amount: 500, source: "offline" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireAccess.mockResolvedValue(municipalityId);
  });

  it.each([
    ["SERVER", "SYNCED", "ACKNOWLEDGE"],
    ["LOCAL", "SYNCED", "ACKNOWLEDGE"],
    ["MANUAL", "FAILED", "RETAIN"],
  ] as const)("creates, replays, conflicts and resolves the same operation with %s", async (resolution, expectedStatus, queueAction) => {
    const state: SyncFlowState = { operations: [], conflicts: [], audits: [] };
    requireDb.mockResolvedValue(makeEndToEndSyncDb(state));
    const caller = appRouter.createCaller(makeContext());

    const created = await caller.municipal.sync.register(input);
    await expect(caller.municipal.sync.register(input)).resolves.toEqual({ status: "SYNCED", idempotent: true });
    await expect(caller.municipal.sync.register({ ...input, payloadHash: "d".repeat(64), payload: { amount: 750, source: "offline" } }))
      .rejects.toMatchObject({ code: "CONFLICT" });

    expect(state.conflicts).toHaveLength(1);
    expect(state.conflicts[0]).toMatchObject({ syncOperationId: created.id, resolution: "PENDING" });

    const resolved = await caller.municipal.sync.resolveConflict({ conflictId: state.conflicts[0].id as string, resolution });

    expect(resolved).toEqual({ success: true, resolution, localQueueAction: queueAction });
    expect(state.operations[0]).toMatchObject({ status: expectedStatus, result: expect.objectContaining({ resolution, localQueueAction: queueAction }) });
    expect(state.conflicts[0]).toMatchObject({ resolution, resolvedBy: 7 });
    expect(state.audits).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "SYNC", entityId: input.entityId }),
      expect.objectContaining({ action: "RESOLVE_CONFLICT", entityId: state.conflicts[0].id, afterValue: { resolution } }),
    ]));
  });
});
