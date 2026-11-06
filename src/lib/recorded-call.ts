import { measuredRpc, RpcFailure } from "./rpc";
import type { Network, Recording } from "./types";

export function recordedCall(
  recording: Recording,
  url: string,
  network: Network,
  timeoutMs = 8000,
) {
  return async <T>(method: string, params: unknown[] = []): Promise<T> => {
    try {
      const result = await measuredRpc<T>(
        url,
        network,
        method,
        params,
        timeoutMs,
      );
      recording.observations.push(result.observation);
      return result.value;
    } catch (error) {
      if (error instanceof RpcFailure)
        recording.observations.push(error.observation);
      throw error;
    }
  };
}
