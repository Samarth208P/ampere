import type { Recording } from "./types";

type Check = (value: unknown) => boolean;
const text =
  (max = 500): Check =>
  (v) =>
    typeof v === "string" && v.length <= max;
const number: Check = (v) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const integer: Check = (v) => number(v) && Number.isSafeInteger(v);
const boolean: Check = (v) => typeof v === "boolean";
const date: Check = (v) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const hex: Check = (v) => typeof v === "string" && /^0x[\da-f]+$/i.test(v);
const hash: Check = (v) => typeof v === "string" && /^0x[\da-f]{64}$/i.test(v);
const oneOf =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const array =
  (check: Check, max: number): Check =>
  (v) =>
    Array.isArray(v) && v.length <= max && v.every(check);

// Reject unknown fields: accidentally persisted params or provider error prose must
// not silently pass through to a signed, shareable report.
function object(
  required: Record<string, Check>,
  optional: Record<string, Check> = {},
): Check {
  return (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const value = v as Record<string, unknown>;
    return (
      Object.entries(required).every(([key, check]) => check(value[key])) &&
      Object.keys(value).every(
        (key) =>
          Object.hasOwn(required, key) ||
          (Object.hasOwn(optional, key) &&
            (value[key] === undefined || optional[key](value[key]))),
      )
    );
  };
}
const network = oneOf("arkiv", "ethereum");
const observation = object(
  {
    id: text(100),
    recordedAt: date,
    network,
    source: oneOf("live", "fixture"),
    method: text(100),
    durationMs: number,
    outcome: oneOf("ok", "rpc-error", "transport-error", "timeout"),
    responseBytes: integer,
  },
  {
    rpcCode: (v) => typeof v === "number" && Number.isSafeInteger(v),
    summary: text(1000),
    workloadId: text(100),
    blockNumber: hex,
  },
);
const node = object({
  network,
  connected: boolean,
  client: nullable(text()),
  chainId: nullable(hex),
  block: nullable(hex),
  peers: nullable(integer),
  syncing: nullable(boolean),
  checkedAt: date,
});
const resources = object({
  recordedAt: date,
  scope: oneOf("collector-host"),
  cpuPercent: nullable(number),
  memoryUsedBytes: number,
  memoryTotalBytes: number,
  diskFreeBytes: nullable(number),
  diskTotalBytes: nullable(number),
  diskDaysRemaining: nullable(number),
});
const recording = object(
  {
    version: oneOf(1),
    mode: oneOf("live", "fixture"),
    observations: array(observation, 1000),
    nodes: array(node, 2),
    resources: nullable(resources),
  },
  {
    container: object({
      name: text(120),
      recordedAt: date,
      cpuPercent: number,
      memory: text(100),
      blockIO: text(100),
      pids: integer,
      dataBytes: nullable(number),
      filesystemFreeBytes: nullable(number),
      diskDaysRemaining: nullable(number),
    }),
    admission: object({
      hash,
      recordedAt: date,
      outcome: text(30),
      checks: array(object({ rule: text(100), verdict: text(30) }), 200),
      events: array(
        object({ kind: text(50), status: nullable(text(30)), at: number }),
        200,
      ),
    }),
    benchmark: object(
      {
        runId: text(100),
        samples: integer,
        cases: integer,
        block: hex,
        completedAt: date,
        stoppedEarly: boolean,
      },
      { blockPolicy: oneOf("fixed", "moving-head") },
    ),
    transaction: object({
      hash,
      status: oneOf("submitted", "included", "reverted"),
      explorer: oneOf("https://explorer.altmempool.wtf/"),
    }),
  },
);

export function isRecording(value: unknown): value is Recording {
  if (!recording(value)) return false;
  const data = value as Recording;
  return (
    new Set(data.observations.map((o) => o.id)).size ===
      data.observations.length &&
    new Set(data.nodes.map((n) => n.network)).size === data.nodes.length &&
    data.observations.every((o) => o.source === data.mode)
  );
}

export function assertRecording(value: unknown): asserts value is Recording {
  if (!isRecording(value))
    throw new Error(
      "Invalid AMPERE v1 recording. Preserve the file and restore a valid backup before collecting.",
    );
}
