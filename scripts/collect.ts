import { setTimeout } from "node:timers/promises";
import { open, unlink, mkdir } from "node:fs/promises";
import { collect } from "../src/lib/collector";
import { readRecording, saveRecording } from "../src/lib/store";

await mkdir(".ampere", { recursive: true });
const lock = await open(".ampere/writer.lock", "wx").catch(() => { throw new Error("Another writer is active. Stop it first; after a crash remove .ampere/writer.lock."); });
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
try {
  do {
    const recording = await collect(await readRecording());
    await saveRecording(recording);
    console.log(`${new Date().toISOString()} ${recording.nodes.map((n) => `${n.network}: ${n.connected ? "connected" : "unreachable"}`).join(" | ")} | ${recording.observations.length} recorded requests`);
    if (!process.argv.includes("--watch") || stopping) break;
    await setTimeout(10_000);
  } while (!stopping);
} finally { await lock.close(); await unlink(".ampere/writer.lock"); }
