import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { assertLocalEndpoint, measuredRpc } from "../src/lib/rpc";
import { ethereumUrl } from "../src/lib/collector";
import { readRecording } from "../src/lib/store";

const exec = promisify(execFile);
let failed = false;
function line(status: "OK" | "WARN" | "FAIL", label: string, detail: string) {
  console.log(`[${status.padEnd(4)}] ${label}: ${detail}`);
  if (status === "FAIL") failed = true;
}
console.log("AMPERE / read-only environment checks\n");
const [major, minor] = process.versions.node.split(".").map(Number);
line(
  major > 22 || (major === 22 && minor >= 16) ? "OK" : "FAIL",
  "Node",
  process.versions.node,
);
await Promise.all([
  (async () => {
    try {
      const { stdout } = await exec(
        "docker",
        ["info", "--format", "{{.ServerVersion}}"],
        { timeout: 10000, windowsHide: true },
      );
      line("OK", "Docker engine", stdout.trim());
      const { stdout: state } = await exec(
        "docker",
        [
          "inspect",
          "--format",
          "{{.State.Running}}",
          process.env.ARKIV_CONTAINER || "ampere-arkiv-1",
        ],
        { timeout: 5000, windowsHide: true },
      );
      line(
        state.trim() === "true" ? "OK" : "FAIL",
        "Arkiv container",
        state.trim() === "true"
          ? "running"
          : "stopped; run docker compose up -d",
      );
    } catch {
      line(
        "FAIL",
        "Docker / container",
        "Start the Linux Docker engine and run docker compose up -d. Check Docker Desktop diagnostics if startup fails.",
      );
    }
  })(),
  (async () => {
    try {
      const url = assertLocalEndpoint(
        process.env.ARKIV_RPC_URL || "http://127.0.0.1:8545",
      );
      const chain = await measuredRpc<string>(
        url,
        "arkiv",
        "eth_chainId",
        [],
        5000,
      );
      await measuredRpc(url, "arkiv", "arkiv_getEntityCount", [], 5000);
      line(
        Number(chain.value) === 1337 ? "OK" : "WARN",
        "Owned Arkiv RPC",
        `responding; chain ${Number(chain.value)}${Number(chain.value) !== 1337 ? "; seed requires the supplied dev chain 1337" : ""}`,
      );
    } catch {
      line(
        "FAIL",
        "Owned Arkiv RPC",
        "Unavailable or not an Arkiv node. Use a literal loopback HTTP URL, start Compose, then retry.",
      );
    }
  })(),
  (async () => {
    try {
      const result = await measuredRpc<string>(
        ethereumUrl(),
        "ethereum",
        "eth_chainId",
        [],
        5000,
      );
      line(
        Number(result.value) === 1337 ? "OK" : "WARN",
        "Ethereum RPC",
        `chain ${Number(result.value)}; sender requires workshop chain 1337`,
      );
    } catch {
      line(
        "WARN",
        "Ethereum RPC",
        "Unavailable; local Arkiv and Example mode remain usable.",
      );
    }
  })(),
]);
try {
  const recording = await readRecording();
  const newest = recording.observations.reduce(
    (n, o) => Math.max(n, Date.parse(o.recordedAt)),
    0,
  );
  line(
    newest && Date.now() - newest <= 30000 ? "OK" : "WARN",
    "Recording",
    `${recording.observations.length} retained requests; ${newest ? `last ${new Date(newest).toISOString()}` : "run npm run collect"}`,
  );
} catch {
  line(
    "FAIL",
    "Recording",
    "Invalid .ampere/recording.json. Preserve it and restore a valid backup before collecting.",
  );
}
try {
  const lock = await readFile(".ampere/writer.lock", "utf8");
  let owner: string;
  try {
    const data = JSON.parse(lock);
    owner = `PID ${data.pid}, started ${data.startedAt}`;
  } catch {
    owner = "legacy lock with no owner metadata";
  }
  line(
    "WARN",
    "Writer lock",
    `${owner}. Stop the active writer before seed/benchmark/send. After a crash, verify no writer is running before removing the lock.`,
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT")
    line("OK", "Writer lock", "available");
  else line("FAIL", "Writer lock", "cannot read .ampere/writer.lock");
}
try {
  const key = (await readFile(".ampere/devnet-key", "utf8")).trim() as Hex;
  line(
    "OK",
    "Devnet sender",
    privateKeyToAccount(key).address + " (key not displayed)",
  );
} catch (error) {
  line(
    "WARN",
    "Devnet sender",
    (error as NodeJS.ErrnoException).code === "ENOENT"
      ? "not created; ethereum:send creates a disposable account"
      : "cannot read a valid .ampere/devnet-key; preserve the file before repair",
  );
}
console.log(
  "\nNo funds requested, transactions sent, or recording files changed.",
);
process.exitCode = failed ? 1 : 0;
