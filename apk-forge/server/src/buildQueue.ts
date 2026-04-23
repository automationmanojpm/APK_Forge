/**
 * Serializes Gradle builds against a single ANDROID_PROJECT_ROOT so concurrent
 * HTTP requests do not corrupt shared app/build outputs or pick the wrong artifact.
 *
 * Each build supplies a stable client_build_id (UUID from the browser) so
 * GET /api/build-queue?client_build_id=… can report queued vs building and place in line.
 */

import { randomBytes } from "node:crypto";

let chain: Promise<unknown> = Promise.resolve();

/** FIFO: front = slot currently running Gradle; rest are waiting. */
const queueOrder: string[] = [];

export type SerializedBuildResult<T> = {
  result: T;
  /** How many builds were already queued or running when this request was enqueued. */
  waitedBehind: number;
};

export function allocateServerClientId(): string {
  return `forge-${randomBytes(8).toString("hex")}`;
}

function normalizeClientId(id: string): string {
  return id.trim().slice(0, 128);
}

export type QueueSnapshot = {
  ok: true;
  pending_builds: number;
  mode: "serialized";
  note?: string;
  your_status?: "building" | "queued" | "unknown";
  your_place?: number;
  total_in_queue?: number;
};

export function getQueueSnapshot(clientId: string | undefined): QueueSnapshot {
  const pending = queueOrder.length;
  const base = {
    ok: true as const,
    pending_builds: pending,
    mode: "serialized" as const,
    note: "Gradle runs one at a time per server; extra requests wait in FIFO order.",
  };
  const raw = clientId?.trim();
  if (!raw) {
    return base;
  }
  const id = normalizeClientId(raw);
  if (!queueOrder.includes(id)) {
    return {
      ...base,
      your_status: "unknown",
      note:
        "This client_build_id is not in the active queue (build may have finished or id is wrong).",
    };
  }
  const idx = queueOrder.indexOf(id);
  const building = idx === 0;
  return {
    ...base,
    your_status: building ? "building" : "queued",
    your_place: idx + 1,
    total_in_queue: pending,
  };
}

/**
 * Run `fn` when all previously enqueued builds have finished. FIFO order.
 * `clientId` must be unique per concurrent build (browser-generated UUID).
 */
export function runSerializedBuild<T>(
  clientId: string,
  fn: () => Promise<T>,
): Promise<SerializedBuildResult<T>> {
  const id = normalizeClientId(clientId) || allocateServerClientId();
  const waitedBehind = queueOrder.length;
  queueOrder.push(id);
  const run = chain.then(async () => {
    try {
      return await fn();
    } finally {
      if (queueOrder[0] === id) {
        queueOrder.shift();
      } else {
        const ix = queueOrder.indexOf(id);
        if (ix >= 0) {
          queueOrder.splice(ix, 1);
        }
      }
    }
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then((result) => ({ result, waitedBehind }));
}
