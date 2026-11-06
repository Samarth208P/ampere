import { Activity, Database, HardDrive, ShieldCheck } from "lucide-react";
import type { Recording } from "@/lib/types";

const gb = (n: number | null) => n === null ? "Unavailable" : `${(n / 1073741824).toFixed(2)} GB`;
export function ContainerDiagnostics({ recording }: { recording: Recording | null }) {
  const data = recording?.container;
  return <section className="host-panel"><div className="panel-heading"><div><h2><Database size={19} />Arkiv node container</h2><span>{data ? `${data.name} · sampled ${new Date(data.recordedAt).toLocaleTimeString()}` : "Start the local Docker node, then run the collector."}</span></div></div>{data ? <>
    <div className="resource-grid"><div><Activity /><span>Container CPU</span><strong>{data.cpuPercent.toFixed(2)}%</strong><small>Docker CPU accounting; can exceed 100%</small></div><div><Database /><span>Container memory</span><strong className="compact-value">{data.memory}</strong><small>{data.pids} processes / threads</small></div><div><HardDrive /><span>Node data on disk</span><strong>{gb(data.dataBytes)}</strong><small>{gb(data.filesystemFreeBytes)} free on shared filesystem</small></div><div><Activity /><span>Disk capacity forecast</span><strong>{data.diskDaysRemaining === null ? "Gathering history" : `${data.diskDaysRemaining.toFixed(1)} days`}</strong><small>Node data growth over ≥60s; shared capacity</small></div></div>
    {data.diskDaysRemaining !== null && data.diskDaysRemaining < 7 && <div className="disk-alert" role="alert">Capacity alert: fewer than 7 days of free space at the observed node growth rate. Check other writers and provision capacity.</div>}
    <p className="panel-footnote">Container metrics cover the whole node, not individual requests. Disk forecast is a linear estimate; other writers share the available capacity. Block I/O: {data.blockIO}.</p>
  </> : <div className="empty">No container sample available. Host metrics below are measured separately.</div>}</section>;
}

export function AdmissionDiagnostics({ recording }: { recording: Recording | null }) {
  const data = recording?.admission;
  if (!data) return null;
  return <section className="host-panel"><div className="panel-heading"><div><h2><ShieldCheck size={19} />Ethereum admission evidence</h2><span>Observed sidecar verdict: {data.outcome}. Explorer records may expire.</span></div></div><p className="panel-footnote break-text">{data.hash}</p><div className="admission-checks">{data.checks.map((check, index) => <div key={`${check.rule}-${index}`}><span>{check.rule}</span><strong>{check.verdict}</strong></div>)}</div><p className="panel-footnote">{data.events.length} lifecycle events retained in the report. Admission rules reflect this experimental devnet revision.</p></section>;
}

export function BenchmarkSummary({ recording }: { recording: Recording | null }) {
  const data = recording?.benchmark;
  if (!data) return null;
  return <div className="benchmark-summary"><Database size={17} /><div><strong>Owned-node benchmark {data.stoppedEarly ? "stopped by guard" : "completed"}</strong><p>{data.samples} requests across {data.cases} private workloads at block {Number(data.block)}. Concurrency 1. Query details are retained locally and excluded from exports.</p></div></div>;
}
