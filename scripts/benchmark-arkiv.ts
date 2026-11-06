import { readFile, writeFile } from "node:fs/promises";
import { withRecordingWriter } from "../src/lib/writer";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { assertLocalEndpoint, measuredRpc, RpcFailure } from "../src/lib/rpc";
import { containerResources } from "../src/lib/container";

const url = assertLocalEndpoint(
  process.env.ARKIV_RPC_URL || "http://127.0.0.1:8545",
);
const file =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ||
  ".ampere/benchmark-cases.json";
const fixedBlock = process.argv.includes("--fixed-block");
const cases: { query: string; limit: number }[] = JSON.parse(
  await readFile(file, "utf8"),
);
if (
  !Array.isArray(cases) ||
  cases.length < 1 ||
  cases.length > 4 ||
  cases.some(
    (c) =>
      !c ||
      typeof c.query !== "string" ||
      c.query.trim().length === 0 ||
      c.query.length > 2000 ||
      !Number.isInteger(c.limit) ||
      c.limit < 1 ||
      c.limit > 10,
  )
)
  throw new Error(
    "Use 1–4 cases with query strings ≤2000 chars and limits 1–10.",
  );
await withRecordingWriter(async (recording) => {
  const runId = randomUUID();
  let stoppedEarly = false;
  let samples = 0;
  try {
    const head = await measuredRpc<string>(url, "arkiv", "eth_blockNumber");
    recording.observations.push(head.observation);
    const block = head.value;
    if (typeof block !== "string" || !/^0x[\da-f]+$/i.test(block))
      throw new Error("Invalid block number from owned node.");
    // Sequential, capped at 40 requests. Retain the returned block for each sample.
    const privateMap = cases.map((value) => ({ id: randomUUID(), ...value }));
    await writeFile(
      `.ampere/benchmark-${runId}.private.json`,
      JSON.stringify({ block, cases: privateMap }, null, 2),
    );
    outer: for (const item of privateMap) {
      for (let i = 0; i < 10; i++) {
        try {
          const result = await measuredRpc<{ blockNumber?: string }>(
            url,
            "arkiv",
            "arkiv_query",
            [
              item.query,
              { limit: item.limit, atBlock: fixedBlock ? block : "latest" },
            ],
            2000,
          );
          result.observation.workloadId = item.id;
          if (
            result.value &&
            typeof result.value.blockNumber === "string" &&
            /^0x[\da-f]+$/i.test(result.value.blockNumber)
          )
            result.observation.blockNumber = result.value.blockNumber;
          result.observation.summary = `Owned-node benchmark; query retained privately. ${fixedBlock ? "Fixed block" : "Moving chain head; underlying state can change"}, concurrency 1, page limit ≤10.`;
          recording.observations.push(result.observation);
          samples++;
          if (result.observation.durationMs > 1000) {
            stoppedEarly = true;
            break outer;
          }
        } catch (error) {
          if (error instanceof RpcFailure) {
            error.observation.workloadId = item.id;
            recording.observations.push(error.observation);
            samples++;
            stoppedEarly = true;
            break outer;
          }
          throw error;
        }
        await setTimeout(200);
      }
    }
    recording.benchmark = {
      runId,
      samples,
      cases: cases.length,
      block,
      blockPolicy: fixedBlock ? "fixed" : "moving-head",
      completedAt: new Date().toISOString(),
      stoppedEarly,
    };
    recording.container = await containerResources();
    console.log(
      `Benchmark ${runId}: ${samples} requests, ${stoppedEarly ? "stopped by latency/error guard" : "completed"}. Query shapes were not published.`,
    );
  } catch (error) {
    if (error instanceof RpcFailure)
      recording.observations.push(error.observation);
    throw error;
  }
});
