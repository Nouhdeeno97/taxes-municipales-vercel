import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export type OfflineCreateCommand = "ACTIVITY" | "ACTIVITY_CATEGORY" | "ACTIVITY_TYPE" | "SECTOR" | "ZONE" | "MARKET" | "MARKET_LOCATION" | "TAX_CATEGORY" | "TAX_TYPE" | "PERIODICITY" | "TAX_RULE" | "ASSIGN_RULE" | "GENERATE_OBLIGATIONS" | "DEPOSIT_DRAFT" | "CLOSING_DRAFT";
type DeferredPayload = { command: OfflineCreateCommand; payload: Record<string, unknown>; label: string };

const hashPayload = async (value: unknown) => {
  const data = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
};

export function useOfflineCreate() {
  const queue = useOfflineQueue();
  const replay = trpc.municipal.sync.replayCreate.useMutation();
  const busy = useRef(false);

  useEffect(() => {
    if (!queue.online || busy.current) return;
    const commands = queue.queue.filter(item => item.entityType === "offline.create");
    if (!commands.length) return;
    let disposed = false;
    busy.current = true;
    void (async () => {
      for (const item of commands) {
        if (disposed) return;
        const body = item.payload as DeferredPayload;
        try {
          await replay.mutateAsync({ deviceId: queue.deviceId, operationId: item.operationId, entityId: item.entityId, command: body.command, payload: body.payload, payloadHash: await hashPayload(body.payload) });
          queue.acknowledge(item.operationId);
          toast.success(`${body.label} synchronisé.`);
        } catch (error) {
          toast.error(error instanceof Error ? `Synchronisation de ${body.label} : ${error.message}` : `Synchronisation de ${body.label} impossible.`);
          return;
        }
      }
    })().finally(() => { busy.current = false; });
    return () => { disposed = true; };
  }, [queue, replay]);

  const defer = useCallback((command: OfflineCreateCommand, payload: Record<string, unknown>, label: string) => {
    const entityId = crypto.randomUUID();
    queue.enqueue({ entityType: "offline.create", entityId, operation: "CREATE", payload: { command, payload, label } satisfies DeferredPayload });
    return entityId;
  }, [queue]);

  return { ...queue, defer };
}
