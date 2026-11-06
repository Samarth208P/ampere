import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Network, Observation } from "./types";

export class RpcFailure extends Error {
  constructor(public observation: Observation) {
    super(`${observation.method}: ${observation.outcome}`);
  }
}

/** Bounded response size, no redirects, and no automatic retries or parameter logging. */
export async function measuredRpc<T>(
  url: string,
  network: Network,
  method: string,
  params: unknown[] = [],
  timeoutMs = 8000,
): Promise<{ value: T; observation: Observation }> {
  const id = randomUUID();
  const observation: Observation = {
    id,
    recordedAt: new Date().toISOString(),
    network,
    source: "live",
    method,
    durationMs: 0,
    outcome: "ok",
    responseBytes: 0,
  };
  const start = performance.now();
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    if (!response.ok || !response.body) throw new Error("HTTP failure");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        observation.responseBytes += value.byteLength;
        if (observation.responseBytes > 2_000_000)
          throw new Error("Response limit");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (
      !body ||
      body.jsonrpc !== "2.0" ||
      body.id !== id ||
      "error" in body === "result" in body
    )
      throw new Error("Invalid RPC envelope");
    if ("error" in body) {
      if (typeof body.error?.code !== "number")
        throw new Error("Invalid RPC error");
      observation.outcome = "rpc-error";
      observation.rpcCode = body.error.code;
      throw new RpcFailure(observation);
    }
    return { value: body.result as T, observation };
  } catch (error) {
    if (!(error instanceof RpcFailure))
      observation.outcome = signal.aborted ? "timeout" : "transport-error";
    throw new RpcFailure(observation);
  } finally {
    observation.durationMs =
      Math.round((performance.now() - start) * 100) / 100;
  }
}

export function assertLocalEndpoint(value: string): string {
  const url = new URL(value);
  // IP literals only: no DNS rebinding, redirects, credentials or external query targets.
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Arkiv collection requires an owned node at http://127.0.0.1 or http://[::1].",
    );
  }
  return url.toString();
}
