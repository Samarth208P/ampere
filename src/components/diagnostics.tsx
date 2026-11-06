import { Activity, Database, HardDrive, ShieldCheck } from "lucide-react";
import type { Recording } from "@/lib/types";
import { diskAlert, methodMetrics } from "@/lib/analysis";

const gb = (n: number | null) =>
  n === null ? "Unavailable" : `${(n / 1073741824).toFixed(2)} GB`;
export function ContainerDiagnostics({
  recording,
}: {
  recording: Recording | null;
}) {
  const data = recording?.container;
  return (
    <section className="host-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <Database size={19} />
            Arkiv node container
          </h2>
          <span>
            {data
              ? `${data.name} · sampled ${new Date(data.recordedAt).toLocaleTimeString()}`
              : "Start the local Docker node, then run the collector."}
          </span>
        </div>
      </div>
      {data ? (
        <>
          <div className="resource-grid">
            <div>
              <Activity />
              <span>Container CPU</span>
              <strong>{data.cpuPercent.toFixed(2)}%</strong>
              <small>Docker CPU accounting; can exceed 100%</small>
            </div>
            <div>
              <Database />
              <span>Container memory</span>
              <strong className="compact-value">{data.memory}</strong>
              <small>{data.pids} processes / threads</small>
            </div>
            <div>
              <HardDrive />
              <span>Node data on disk</span>
              <strong>{gb(data.dataBytes)}</strong>
              <small>
                {gb(data.filesystemFreeBytes)} free on shared filesystem
              </small>
            </div>
            <div>
              <Activity />
              <span>Disk capacity forecast</span>
              <strong>
                {data.diskDaysRemaining === null
                  ? "Gathering history"
                  : `${data.diskDaysRemaining.toFixed(1)} days`}
              </strong>
              <small>Node data growth over ≥60s; shared capacity</small>
            </div>
          </div>
          {diskAlert(data.diskDaysRemaining) && (
            <div className="disk-alert" role="alert">
              Capacity alert: fewer than 7 days of free space at the observed
              node growth rate. Check other writers and provision capacity.
            </div>
          )}
          <p className="panel-footnote">
            Container metrics cover the whole node, not individual requests.
            Disk forecast is a linear estimate; other writers share the
            available capacity. Block I/O: {data.blockIO}.
          </p>
        </>
      ) : (
        <div className="empty">
          No container sample available. Host metrics below are measured
          separately.
        </div>
      )}
    </section>
  );
}

export function MethodDiagnostics({
  recording,
}: {
  recording: Recording | null;
}) {
  const rows = methodMetrics(recording?.observations ?? []);
  const ms = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(2)} ms`;
  return (
    <section className="host-panel method-metrics">
      <div className="panel-heading">
        <div>
          <h2>RPC method counters</h2>
          <span>
            AMPERE probes and benchmark traffic in the retained recording. Other
            node clients are not counted.
          </span>
        </div>
      </div>
      <div className="table-scroll">
        <table aria-label="RPC method counters">
          <thead>
            <tr>
              <th>Network / method</th>
              <th>Requests</th>
              <th>Failures</th>
              <th>p50</th>
              <th>p95</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <span className="method-name">{row.method}</span>
                  <small className="network-label">{row.network}</small>
                </td>
                <td className="mono">{row.count}</td>
                <td className="mono">{row.failures}</td>
                <td className="mono">{ms(row.p50)}</td>
                <td className="mono">{ms(row.p95)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty">
          Run the collector to record method counters.
        </div>
      )}
    </section>
  );
}

export function AdmissionDiagnostics({
  recording,
}: {
  recording: Recording | null;
}) {
  const data = recording?.admission;
  if (!data) return null;
  return (
    <section className="host-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <ShieldCheck size={19} />
            Ethereum admission evidence
          </h2>
          <span>
            Observed sidecar verdict: {data.outcome}. Explorer records may
            expire.
          </span>
        </div>
      </div>
      <p className="panel-footnote break-text">{data.hash}</p>
      <div className="admission-checks">
        {data.checks.map((check, index) => (
          <div key={`${check.rule}-${index}`}>
            <span>{check.rule}</span>
            <strong>{check.verdict}</strong>
          </div>
        ))}
      </div>
      <p className="panel-footnote">
        {data.events.length} lifecycle events retained in the report. Admission
        rules reflect this experimental devnet revision.
      </p>
    </section>
  );
}

export function BenchmarkSummary({
  recording,
}: {
  recording: Recording | null;
}) {
  const data = recording?.benchmark;
  if (!data) return null;
  return (
    <div className="benchmark-summary">
      <Database size={17} />
      <div>
        <strong>
          Owned-node benchmark{" "}
          {data.stoppedEarly ? "stopped by guard" : "completed"}
        </strong>
        <p>
          {data.samples} requests across {data.cases} private workloads,
          starting at block {Number(data.block)}.{" "}
          {data.blockPolicy === "moving-head"
            ? "Moving chain head; state may change between samples."
            : "Fixed block."}{" "}
          Concurrency 1. Query details stay local.
        </p>
      </div>
    </div>
  );
}
