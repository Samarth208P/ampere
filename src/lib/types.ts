export type Network = "ethereum" | "arkiv";
export type Outcome = "ok" | "rpc-error" | "transport-error" | "timeout";
export interface Observation {
  id: string;
  recordedAt: string;
  network: Network;
  source: "live" | "fixture";
  method: string;
  durationMs: number;
  outcome: Outcome;
  responseBytes: number;
  rpcCode?: number;
  // Only explicit, non-sensitive summaries enter the recorder. Never params.
  summary?: string;
  workloadId?: string;
  blockNumber?: string;
}
export interface Resources {
  recordedAt: string;
  scope: "collector-host";
  cpuPercent: number | null;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
  diskDaysRemaining: number | null;
}
export interface NodeStatus {
  network: Network;
  connected: boolean;
  client: string | null;
  chainId: string | null;
  block: string | null;
  peers: number | null;
  syncing: boolean | null;
  checkedAt: string;
}
export interface Recording {
  version: 1;
  mode: "live" | "fixture";
  observations: Observation[];
  nodes: NodeStatus[];
  resources: Resources | null;
  container?: {
    name: string;
    recordedAt: string;
    cpuPercent: number;
    memory: string;
    blockIO: string;
    pids: number;
    dataBytes: number | null;
    filesystemFreeBytes: number | null;
    diskDaysRemaining: number | null;
  };
  admission?: {
    hash: string;
    recordedAt: string;
    outcome: string;
    checks: { rule: string; verdict: string }[];
    events: { kind: string; status: string | null; at: number }[];
  };
  benchmark?: {
    runId: string;
    samples: number;
    cases: number;
    block: string;
    blockPolicy?: "fixed" | "moving-head";
    completedAt: string;
    stoppedEarly: boolean;
  };
  transaction?: {
    hash: string;
    status: "submitted" | "included" | "reverted";
    explorer: string;
  };
}
