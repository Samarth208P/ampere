import { mkdir, open, unlink } from "node:fs/promises";
import { ethereumUrl } from "../src/lib/collector";
import { measuredRpc, RpcFailure } from "../src/lib/rpc";
import { parseAdmission } from "../src/lib/admission";
import { readRecording, saveRecording } from "../src/lib/store";

await mkdir(".ampere", { recursive: true });
const lock = await open(".ampere/writer.lock", "wx").catch(() => {
  throw new Error("Stop the collector before inspecting a transaction.");
});
const recording = await readRecording();
try {
  const hash = process.argv[2] || recording.transaction?.hash;
  if (!hash || !/^0x[\da-f]{64}$/i.test(hash))
    throw new Error(
      "Provide a transaction hash: npm run ethereum:inspect -- 0x...",
    );
  const result = await measuredRpc(
    ethereumUrl(),
    "ethereum",
    "skandha_explorer_getTransaction",
    [hash],
  );
  recording.observations.push(result.observation);
  recording.admission = parseAdmission(result.value, hash);
  console.log(
    `Admission: ${recording.admission.outcome}, ${recording.admission.checks.length} rule checks, ${recording.admission.events.length} lifecycle events.`,
  );
} catch (error) {
  if (error instanceof RpcFailure)
    recording.observations.push(error.observation);
  throw error;
} finally {
  await saveRecording(recording);
  await lock.close();
  await unlink(".ampere/writer.lock");
}
