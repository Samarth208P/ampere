import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Recording } from "./types";
import { nodeDiskForecast } from "./analysis";
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
      if (free !== null)
        days = nodeDiskForecast(baseline ?? { at: now, bytes }, {
          at: now,
          bytes,
          free,
        });
      if (!baseline || bytes < baseline.bytes) baseline = { at: now, bytes };
    }
    const cpu = Number.parseFloat(stats.CPUPerc);
    const pids = Number(stats.PIDs);
    if (
      !Number.isFinite(cpu) ||
      cpu < 0 ||
      !Number.isSafeInteger(pids) ||
      pids < 0 ||
      typeof stats.MemUsage !== "string" ||
      typeof stats.BlockIO !== "string"
    )
      return undefined;
    return {
      name,
      recordedAt: new Date().toISOString(),
      cpuPercent: cpu,
      memory: String(stats.MemUsage),
      blockIO: String(stats.BlockIO),
      pids,
      dataBytes:
        bytes !== null && Number.isFinite(bytes) && bytes >= 0 ? bytes : null,
      filesystemFreeBytes:
        free !== null && Number.isFinite(free) && free >= 0 ? free : null,
      diskDaysRemaining: days,
    };
  } catch {
    return undefined;
  }
}
