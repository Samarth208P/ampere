import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Recording } from "./types";
const exec = promisify(execFile);
let baseline: { at: number; bytes: number } | undefined;

export async function containerResources(): Promise<Recording["container"]> {
  const name = process.env.ARKIV_CONTAINER || "ampere-arkiv-1";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/.test(name))
    throw new Error("Invalid container name");
  try {
    const { stdout } = await exec(
      "docker",
      ["stats", name, "--no-stream", "--format", "{{json .}}"],
      { timeout: 8000, windowsHide: true },
    );
    const stats = JSON.parse(stdout);
    const [size, disk] = await Promise.all([
      exec("docker", ["exec", name, "du", "-sk", "/data"], {
        timeout: 3000,
        windowsHide: true,
      }).catch(() => null),
      exec("docker", ["exec", name, "df", "-Pk", "/data"], {
        timeout: 3000,
        windowsHide: true,
      }).catch(() => null),
    ]);
    const bytes = size
      ? Number(size.stdout.trim().split(/\s+/)[0]) * 1024
      : null;
    const free = disk
      ? Number(disk.stdout.trim().split("\n").at(-1)!.split(/\s+/)[3]) * 1024
      : null;
    let days: number | null = null;
    if (bytes !== null && Number.isFinite(bytes)) {
      const now = Date.now();
      if (
        baseline &&
        now - baseline.at >= 60_000 &&
        bytes > baseline.bytes &&
        free !== null &&
        Number.isFinite(free)
      ) {
        days =
          free / ((bytes - baseline.bytes) / (now - baseline.at)) / 86_400_000;
      }
      if (!baseline || bytes < baseline.bytes) baseline = { at: now, bytes };
    }
    const cpu = Number.parseFloat(stats.CPUPerc);
    if (!Number.isFinite(cpu)) return undefined;
    return {
      name,
      recordedAt: new Date().toISOString(),
      cpuPercent: cpu,
      memory: String(stats.MemUsage),
      blockIO: String(stats.BlockIO),
      pids: Number(stats.PIDs),
      dataBytes: bytes !== null && Number.isFinite(bytes) ? bytes : null,
      filesystemFreeBytes: free !== null && Number.isFinite(free) ? free : null,
      diskDaysRemaining: days,
    };
  } catch {
    return undefined;
  }
}
