import os from "node:os";
import { statfs } from "node:fs/promises";
import { measuredRpc, RpcFailure, assertLocalEndpoint } from "./rpc";
import { diskForecast } from "./analysis";
import type { Network, NodeStatus, Observation, Recording, Resources } from "./types";

export const ethereumUrl = () => process.env.ETHEREUM_RPC_URL || "https://altmempoolgateway.forshtat.com/rpc";
let previousCpu: { idle: number; total: number } | undefined;
let diskBaseline: { at: number; free: number } | undefined;

export async function hostResources(): Promise<Resources> {
  const cpu = os.cpus().reduce((sum, c) => ({ idle: sum.idle + c.times.idle, total: sum.total + Object.values(c.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
  const delta = previousCpu ? cpu.total - previousCpu.total : 0;
  const cpuPercent = previousCpu && delta > 0 ? (1 - (cpu.idle - previousCpu.idle) / delta) * 100 : null;
  previousCpu = cpu;
  const disk = await statfs(process.env.AMPERE_DISK_PATH || process.cwd()).catch(() => null);
  const diskFreeBytes = disk ? disk.bavail * disk.bsize : null;
  const sample = diskFreeBytes === null ? null : { at: Date.now(), free: diskFreeBytes };
  const days = sample && diskBaseline ? diskForecast(diskBaseline, sample) : null;
  if (sample && (!diskBaseline || sample.free > diskBaseline.free)) diskBaseline = sample;
  return { recordedAt: new Date().toISOString(), scope: "collector-host", cpuPercent,
    memoryUsedBytes: os.totalmem() - os.freemem(), memoryTotalBytes: os.totalmem(), diskFreeBytes,
    diskTotalBytes: disk ? disk.blocks * disk.bsize : null, diskDaysRemaining: days };
}

export async function collectNode(network: Network, url: string): Promise<{ node: NodeStatus; observations: Observation[] }> {
  if (network === "arkiv") assertLocalEndpoint(url);
  const observations: Observation[] = [];
  const read = async (method: string): Promise<unknown> => {
    try { const result = await measuredRpc<unknown>(url, network, method); observations.push(result.observation); return result.value; }
    catch (error) { if (error instanceof RpcFailure) { observations.push(error.observation); return null; } throw error; }
  };
  const client = await read("web3_clientVersion");
  const node: NodeStatus = { network, connected: typeof client === "string", client: typeof client === "string" ? client : null,
    chainId: null, block: null, peers: null, syncing: null, checkedAt: new Date().toISOString() };
  if (!node.connected) return { node, observations };
  const chain = await read("eth_chainId");
  const block = await read("eth_blockNumber");
  node.chainId = typeof chain === "string" ? chain : null;
  node.block = typeof block === "string" ? block : null;
  if (network === "arkiv") {
    const peers = await read("net_peerCount");
    const sync = await read("eth_syncing");
    node.peers = typeof peers === "string" && /^0x[\da-f]+$/i.test(peers) ? Number(BigInt(peers)) : null;
    node.syncing = sync === false ? false : sync !== null && typeof sync === "object" ? true : null;
    await read("arkiv_getEntityCount");
  }
  return { node, observations };
}

export async function collect(recording: Recording): Promise<Recording> {
  const arkiv = assertLocalEndpoint(process.env.ARKIV_RPC_URL || "http://127.0.0.1:8545");
  const results = await Promise.all([collectNode("arkiv", arkiv), collectNode("ethereum", ethereumUrl())]);
  return { ...recording, mode: "live", nodes: results.map((r) => r.node), resources: await hostResources(),
    observations: [...recording.observations, ...results.flatMap((r) => r.observations)].slice(-1000) };
}
