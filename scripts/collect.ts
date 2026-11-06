import { setTimeout } from "node:timers/promises";
import { withWriter } from "../src/lib/writer";
import { collect } from "../src/lib/collector";
import { readRecording, saveRecording } from "../src/lib/store";

const controller = new AbortController();
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  controller.abort();
});
process.on("SIGTERM", () => {
  stopping = true;
  controller.abort();
});
await withWriter(async () => {
  do {
    const recording = await collect(await readRecording());
    await saveRecording(recording);
    console.log(
      `${new Date().toISOString()} ${recording.nodes.map((n) => `${n.network}: ${n.connected ? "connected" : "unreachable"}`).join(" | ")} | ${recording.observations.length} recorded requests`,
    );
    if (!process.argv.includes("--watch") || stopping) break;
    await setTimeout(10_000, undefined, { signal: controller.signal }).catch(
      (error) => {
        if (error.name !== "AbortError") throw error;
      },
    );
  } while (!stopping);
});
