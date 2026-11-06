import type { Observation, Recording } from "./types";

export function fixtureRecording(): Recording {
  const start = Date.UTC(2026, 10, 6, 4, 30);
  const observations: Observation[] = [];
  for (let i = 0; i < 36; i++) {
    const network = i % 3 === 0 ? "ethereum" : "arkiv";
    const method =
      network === "ethereum"
        ? "eth_estimateFrameTransactionGas"
        : "arkiv_getEntityCount";
    observations.push({
      id: `fixture-${i}`,
      recordedAt: new Date(start + i * 2000).toISOString(),
      network,
      source: "fixture",
      method,
      durationMs:
        network === "arkiv" && i > 22 ? 124 + (i % 7) * 19 : 18 + (i % 5) * 5,
      outcome: i === 30 ? "rpc-error" : "ok",
      responseBytes: 180 + i * 7,
      ...(i === 30
        ? {
            rpcCode: -32602,
            summary:
              "Illustrative invalid-parameters response; not a measured protocol rejection.",
          }
        : {}),
    });
  }
  return {
    version: 1,
    mode: "fixture",
    observations,
    nodes: ["ethereum", "arkiv"].map((network) => ({
      network: network as "ethereum" | "arkiv",
      connected: true,
      client: "Illustrative node",
      chainId: network === "ethereum" ? "0x539" : "0x7a69",
      block: "0x1234",
      peers: 2,
      syncing: false,
      checkedAt: observations.at(-1)!.recordedAt,
    })),
    resources: null,
  };
}
