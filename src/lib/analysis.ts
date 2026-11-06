import type { Observation } from "./types";

export function percentile(values: number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
}

export function summarize(observations: Observation[]) {
  const groups = Map.groupBy(
    observations,
    (o) => `${o.network}:${o.method}:${o.workloadId ?? "default"}`,
  );
  return [...groups].map(([key, rows]) => {
    // Errors/timeouts are not successful latency measurements.
    const successful = rows.filter((o) => o.outcome === "ok");
    const baseline = successful.slice(0, 5);
    const recent = successful.slice(-5);
    const baselineMedian = percentile(
      baseline.map((o) => o.durationMs),
      0.5,
    );
    const recentMedian = percentile(
      recent.map((o) => o.durationMs),
      0.5,
    );
    const ratio =
      successful.length >= 10 &&
      baselineMedian !== null &&
      baselineMedian > 0 &&
      recentMedian !== null
        ? recentMedian / baselineMedian
        : null;
    return {
      key,
      network: rows[0].network,
      method: rows[0].method,
      workloadId: rows[0].workloadId,
      count: rows.length,
      errors: rows.length - successful.length,
      p50: percentile(
        successful.map((o) => o.durationMs),
        0.5,
      ),
      p95: percentile(
        successful.map((o) => o.durationMs),
        0.95,
      ),
      baselineMedian,
      recentMedian,
      ratio,
      elevated: ratio !== null && ratio >= 3,
    };
  });
}

/** Estimate only from a >=60s observation window with positive net disk usage. */
export function diskForecast(
  previous: { at: number; free: number },
  current: { at: number; free: number },
): number | null {
  const elapsed = current.at - previous.at;
  const used = previous.free - current.free;
  if (elapsed < 60_000 || used <= 0 || current.free < 0) return null;
  return current.free / (used / elapsed) / 86_400_000;
}
