import { useCallback, useEffect, useMemo, useState } from "react";

const QUEUE_KEY = "taxe-marche.offline-queue.v1";
const DEVICE_KEY = "taxe-marche.device-id.v1";

export type QueuedOperation = {
  operationId: string;
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "CANCEL" | "SUBMIT";
  payload: unknown;
  createdAt: string;
};

function readQueue(): QueuedOperation[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueuedOperation[]; } catch { return []; }
}

function persistQueue(queue: QueuedOperation[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }

export function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, next);
  return next;
}

export function useOfflineQueue() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queue, setQueue] = useState<QueuedOperation[]>(() => readQueue());

  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); setQueue(readQueue()); };
    window.addEventListener("online", refresh); window.addEventListener("offline", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const enqueue = useCallback((operation: Omit<QueuedOperation, "operationId" | "createdAt">) => {
    const item: QueuedOperation = { ...operation, operationId: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const next = [...readQueue(), item]; persistQueue(next); setQueue(next); return item;
  }, []);

  const acknowledge = useCallback((operationId: string) => {
    const next = readQueue().filter(item => item.operationId !== operationId); persistQueue(next); setQueue(next);
  }, []);

  return useMemo(() => ({ online, queue, queueSize: queue.length, deviceId: getDeviceId(), enqueue, acknowledge }), [online, queue, enqueue, acknowledge]);
}
