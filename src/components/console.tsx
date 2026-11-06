"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpRight, Box, Check, ChevronRight, CircleHelp, Cpu, Database, Fingerprint, HardDrive, Layers, Pause, Play, Radio, RefreshCw, Search, ShieldCheck, Upload, Zap } from "lucide-react";
import { summarize, percentile } from "@/lib/analysis";
import type { Observation, Recording } from "@/lib/types";
import { ContainerDiagnostics, AdmissionDiagnostics, BenchmarkSummary } from "./diagnostics";

const formatMs = (n: number | null) => n === null ? "—" : `${n.toFixed(1)} ms`;
const gb = (n: number | null) => n === null ? "—" : `${(n / 1073741824).toFixed(1)} GB`;
const time = (value: string) => new Date(value).toLocaleTimeString("en-GB", { hour12: false });
const names = { ethereum: "Ethereum", arkiv: "Arkiv" };

export function Console() {
  const [mode, setMode] = useState<"live" | "fixture">("live");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [tab, setTab] = useState("Recorder");
  const [network, setNetwork] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [verification, setVerification] = useState<{ valid: boolean; sha256?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/recording?mode=${mode}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) { setRecording(data); setError(""); }
      } catch (e) { if (active && !controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not read the recording."); }
    }
    void load();
    const timer = !paused && mode === "live" ? setInterval(load, 5000) : undefined;
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [mode, paused, refresh]);

  const rows = (recording?.observations ?? []).filter((o) => (network === "all" || o.network === network) && o.method.toLowerCase().includes(query.toLowerCase()));
  const current = rows.find((o) => o.id === selected) ?? rows.at(-1);
  const groups = summarize(rows);
  const elevated = groups.filter((g) => g.elevated);
  const errors = rows.filter((o) => o.outcome !== "ok").length;
  const p95 = percentile(rows.filter((o) => o.outcome === "ok").map((o) => o.durationMs), 0.95);
  const latest = recording?.observations.at(-1)?.recordedAt;
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const stale = mode === "live" && latest && now - Date.parse(latest) > 30000;

  async function exportReport() {
    setExporting(true); setNotice("");
    try {
      const response = await fetch(`/api/report?mode=${mode}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Export failed.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `ampere-${mode}-${data.sha256.slice(0, 12)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Signed report downloaded. Verify it in the Reports tab.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Export failed."); }
    finally { setExporting(false); }
  }

  async function verifyFile(file?: File) {
    if (!file) return;
    setVerification(null); setNotice("");
    if (file.size > 2_000_000) { setNotice("Choose a report smaller than 2 MB."); return; }
    try {
      const response = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setVerification(result);
    } catch { setNotice("Could not verify this report. Check the file and try again."); }
    if (fileInput.current) fileInput.current.value = "";
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="AMPERE home"><span className="brand-mark"><Zap size={24} fill="currentColor" /></span>ampere<span className="brand-period">.</span></a>
      <div className="workspace"><span className="workspace-icon"><Box size={19} /></span><div>Local workspace<small>Infrastructure observability</small></div><span className="workspace-light" /></div>
      <div className="nav-label">Workspace</div>
      <nav aria-label="Workspace">{[{ name: "Recorder", icon: Activity }, { name: "Nodes", icon: Layers }, { name: "Reports", icon: ShieldCheck }].map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}><Icon size={19} />{name}{name === "Recorder" && <span className="nav-count">{recording?.observations.length ?? 0}</span>}</button>)}</nav>
      <div className="sidebar-networks"><div className="nav-label">Connected networks</div>{(["ethereum", "arkiv"] as const).map((name) => {
        const node = recording?.nodes.find((n) => n.network === name);
        return <div className="sidebar-node" key={name}><span className={`network-symbol ${name}`}><Database size={15} /></span><div>{names[name]}<small>{name === "ethereum" ? "Frame transaction devnet" : "Local development node"}</small></div><span className={`dot ${node?.connected && !stale ? "green" : "amber"}`} /></div>;
      })}</div>
      <div className="sidebar-bottom"><Fingerprint size={28} /><strong>Keep the evidence.</strong><p>Every request leaves a trace.<br />Make yours inspectable.</p><span>AMPERE <span className="version">v0.1</span></span></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} /><strong>{tab}</strong></div><div className="topbar-right"><span className="local-badge"><span className="dot green" />Local-first</span><a href="https://ethglobal.com/events/mumbai/prizes" target="_blank" rel="noreferrer" aria-label="Open track requirements"><CircleHelp size={18} /></a><span className="avatar">A</span></div></header>
      <main>
        <div className="page-heading"><div><div className="heading-caption"><Radio size={15} />Infrastructure flight recorder</div><h1>{tab === "Recorder" ? "Know what your nodes went through." : tab === "Nodes" ? "A closer look at your infrastructure." : "Evidence you can take with you."}</h1><p>{tab === "Recorder" ? "Follow requests, spot latency changes, and preserve the evidence." : tab === "Nodes" ? "Connection state and resource measurements, with their scope made explicit." : "Export a signed recording and independently check its integrity."}</p></div><button className="primary-button" disabled={exporting || !recording?.observations.length} onClick={exportReport}><ArrowDownToLine size={17} />{exporting ? "Signing…" : "Export report"}</button></div>

        <div className={`recording-banner ${mode === "fixture" ? "fixture-banner" : ""}`}><div><span className={`dot ${mode === "fixture" || stale ? "amber" : "blue"}`} /><strong>{mode === "fixture" ? "Illustrative recording" : stale ? "Saved live recording" : "Live measurements"}</strong><span>{mode === "fixture" ? "Synthetic examples. No network claims." : latest ? `Last request ${time(latest)}${stale ? " — collector is not updating" : ""}` : "Run npm run collect to start recording."}</span></div><div className="mode-switch" aria-label="Recording source"><button aria-pressed={mode === "live"} onClick={() => { setMode("live"); setSelected(null); }}>Live</button><button aria-pressed={mode === "fixture"} onClick={() => { setMode("fixture"); setSelected(null); }}>Example</button></div></div>
        {error && <div className="message error" role="alert">{error}</div>}
        {notice && <div className="message" role="status">{notice}</div>}

        {tab === "Recorder" && <>
          <div className="summary-strip"><div><span>Recorded requests</span><strong>{rows.length}<small>in this view</small></strong></div><div><span>Successful request p95</span><strong>{formatMs(p95)}<small>client round-trip</small></strong></div><div><span>Failed requests</span><strong className={errors ? "attention" : ""}>{errors}<small>RPC + transport</small></strong></div><div><span>Elevated methods</span><strong>{elevated.length}<small>≥3× baseline median</small></strong></div></div>
          <section className="timeline-panel"><div className="panel-heading"><div><h2>Request timeline</h2><span>Each bar is one recorded request. Height is wall-clock latency.</span></div><div className="chart-legend"><span><i className="legend-ethereum" />Ethereum</span><span><i className="legend-arkiv" />Arkiv</span><span><i className="legend-error" />Failed</span></div></div><Timeline rows={rows} selected={current?.id} onSelect={setSelected} /></section>
          <div className="recorder-grid"><section className="requests-panel"><div className="panel-heading"><h2>Request log <span className="count-badge">{rows.length}</span></h2><div className="icon-actions"><button title={paused ? "Resume view updates" : "Pause view updates"} aria-label={paused ? "Resume view updates" : "Pause view updates"} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button><button title="Refresh recording" aria-label="Refresh recording" onClick={() => setRefresh(refresh + 1)}><RefreshCw size={16} /></button></div></div>
            <div className="table-toolbar"><div className="filter-tabs">{["all", "ethereum", "arkiv"].map((n) => <button key={n} aria-pressed={network === n} onClick={() => setNetwork(n)}>{n === "all" ? "All networks" : names[n as "ethereum" | "arkiv"]}</button>)}</div><label className="search"><Search size={15} /><input placeholder="Find a method…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a method" /></label></div>
            <div className="table-scroll"><table><thead><tr><th>Time</th><th>Method / network</th><th>Latency</th><th>Outcome</th><th><span className="sr-only">Inspect</span></th></tr></thead><tbody>{[...rows].reverse().slice(0, 100).map((row) => <tr key={row.id} className={current?.id === row.id ? "selected-row" : ""}><td className="mono muted">{time(row.recordedAt)}</td><td><span className="method-name">{row.method}</span><small className="network-label"><i className={`dot ${row.network === "arkiv" ? "teal" : "blue"}`} />{names[row.network]}</small></td><td className="mono">{formatMs(row.durationMs)}</td><td><span className={`outcome ${row.outcome === "ok" ? "success" : "failure"}`}>{row.outcome === "ok" ? <Check size={12} /> : <span>!</span>}{row.outcome === "ok" ? "Success" : row.outcome}</span></td><td><button className="inspect-button" aria-label={`Inspect request ${row.id}`} onClick={() => setSelected(row.id)}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!rows.length && <div className="empty"><Radio size={28} /><h3>No requests in this view</h3><p>{query ? "Try another method or network." : "Run npm run collect, or open the Example recording to explore the console."}</p></div>}</div><div className="table-footer">Showing {Math.min(rows.length, 100)} of {rows.length} requests<span>{paused ? "View updates paused" : "View refreshes every 5s"}</span></div>
          </section><aside className="inspector"><div className="inspector-title"><Fingerprint size={19} /><h2>Evidence inspector</h2></div>{current ? <><div className={`inspector-status ${current.outcome !== "ok" ? "attention" : ""}`}>{current.outcome === "ok" ? <ShieldCheck size={21} /> : <Activity size={21} />}<div>{current.outcome === "ok" ? "Response received" : "Request did not succeed"}<small>{current.source === "live" ? "Recorded from a real RPC exchange" : "Synthetic example observation"}</small></div></div><h3 className="inspector-method">{current.method}</h3><dl><dt>Network</dt><dd>{names[current.network]}</dd><dt>Wall-clock latency</dt><dd className="mono">{formatMs(current.durationMs)}</dd><dt>Response size</dt><dd className="mono">{current.responseBytes.toLocaleString()} bytes</dd><dt>Outcome</dt><dd>{current.outcome}</dd>{current.rpcCode !== undefined && <><dt>RPC error code</dt><dd className="mono">{current.rpcCode}</dd></>}<dt>Recorded at</dt><dd>{time(current.recordedAt)}</dd></dl><div className="inspector-note"><CircleHelp size={16} /><p>{current.summary || "Latency includes network travel and node processing. It does not establish server CPU cost or an admission-policy violation."}</p></div><div className="observation-id"><span>Observation ID</span><code>{current.id}</code></div><div className="privacy-note"><ShieldCheck size={14} />Request parameters are not stored.</div></> : <div className="empty"><p>Select a recorded request to inspect its evidence.</p></div>}</aside></div>
          <section className="comparison-panel"><div className="panel-heading"><div><h2>Baseline comparison</h2><span>First 5 vs. latest 5 successful requests per method. At least 10 required.</span></div></div><div className="comparison-list">{groups.map((g) => <div key={g.key}><span><strong>{g.method}</strong><small>{names[g.network]}</small></span><span>{formatMs(g.baselineMedian)}<small>baseline median</small></span><span>{formatMs(g.recentMedian)}<small>recent median</small></span><span className={g.elevated ? "attention" : "muted"}>{g.ratio === null ? "Collecting baseline" : `${g.ratio.toFixed(2)}×`}</span></div>)}</div></section>
        </>}

        {tab === "Nodes" && <div className="nodes-view">{recording?.nodes.map((node) => <section className="node-panel" key={node.network}><div className="panel-heading"><h2>{names[node.network]}</h2><span className={`outcome ${node.connected && !stale ? "success" : "failure"}`}>{stale ? "Last known state" : node.connected ? "Connected" : "Unreachable"}</span></div><dl><dt>Client</dt><dd className="break-text">{node.client || "Unavailable"}</dd><dt>Chain ID</dt><dd>{node.chainId ? Number(node.chainId) : "Unavailable"}</dd><dt>Latest block</dt><dd>{node.block ? Number(node.block).toLocaleString() : "Unavailable"}</dd><dt>Peers</dt><dd>{node.peers ?? "Not measured"}</dd><dt>Sync</dt><dd>{node.syncing === null ? "Not measured" : node.syncing ? "Syncing" : "Synced"}</dd></dl>{node.network === "ethereum" && <div className="node-callout"><strong>{recording.transaction ? `Frame transaction ${recording.transaction.status}` : "Frame transaction pending funding"}</strong><p>{recording.transaction?.hash || "The sender is ready. Fund the workshop devnet account, then run npm run ethereum:send."}</p><a href="https://explorer.altmempool.wtf/" target="_blank" rel="noreferrer">Open devnet explorer <ArrowUpRight size={14} /></a></div>}</section>)}
          <section className="host-panel"><div className="panel-heading"><div><h2><Cpu size={19} />Collector host resources</h2><span>These are host-wide measurements, not Arkiv process attribution.</span></div></div>{recording?.resources ? <div className="resource-grid"><div><Cpu /><span>Host CPU</span><strong>{recording.resources.cpuPercent === null ? "Awaiting second sample" : `${recording.resources.cpuPercent.toFixed(1)}%`}</strong></div><div><Layers /><span>Host memory used</span><strong>{gb(recording.resources.memoryUsedBytes)}</strong><small>of {gb(recording.resources.memoryTotalBytes)}</small></div><div><HardDrive /><span>Collector filesystem free</span><strong>{gb(recording.resources.diskFreeBytes)}</strong><small>of {gb(recording.resources.diskTotalBytes)}</small></div><div><Activity /><span>Estimated time to full</span><strong>{recording.resources.diskDaysRemaining === null ? "Insufficient history" : `${recording.resources.diskDaysRemaining.toFixed(1)} days`}</strong><small>Linear forecast, ≥60s window</small></div></div> : <div className="empty">Host telemetry is available in a live recording.</div>}</section>
        </div>}

        {tab === "Reports" && <div className="reports-view"><section className="report-panel"><div className="report-icon"><Fingerprint size={32} /></div><h2>A portable record of what happened.</h2><p>Your report includes the current recording, measurement scope, a SHA-256 digest, and an Ed25519 signature. Raw request parameters and private keys stay out.</p><button className="primary-button" onClick={exportReport} disabled={exporting || !recording?.observations.length}><ArrowDownToLine size={17} />Download signed report</button><div className="report-facts"><span><Check size={15} />{recording?.observations.length ?? 0} observations</span><span><Check size={15} />{mode === "live" ? "Live measurements" : "Clearly marked synthetic data"}</span></div></section><section className="report-panel verify-panel"><ShieldCheck size={32} /><h2>Verify a report</h2><p>Check that its signed contents haven’t changed. Verification runs on this local AMPERE server; the file is not retained.</p><input className="sr-only" type="file" accept=".json,application/json" ref={fileInput} onChange={(event) => verifyFile(event.target.files?.[0])} /><button className="secondary-button" onClick={() => fileInput.current?.click()}><Upload size={17} />Choose report</button>{verification && <div className={`verification-result ${verification.valid ? "verified" : "invalid"}`} role="status"><strong>{verification.valid ? "Integrity verified" : "Integrity check failed"}</strong><p>{verification.valid ? "The digest and signature match this report." : "The report is modified, malformed, or signed incorrectly."}</p>{verification.sha256 && <code>{verification.sha256}</code>}</div>}<p className="verification-caveat">A valid signature proves integrity and possession of a key. It does not prove operator identity or measurement truth.</p></section></div>}
        {tab === "Nodes" && <div className="extra-diagnostics"><ContainerDiagnostics recording={recording} /><AdmissionDiagnostics recording={recording} /></div>}
        {tab === "Recorder" && <BenchmarkSummary recording={recording} />}
        <footer className="page-footer"><span><ShieldCheck size={14} />Evidence before conclusions.</span><span>Local storage · No analytics · MIT licensed</span></footer>
      </main>
    </div>
  </div>;
}

function Timeline({ rows, selected, onSelect }: { rows: Observation[]; selected?: string; onSelect: (id: string) => void }) {
  const visible = rows.slice(-90);
  const max = Math.max(1, ...visible.map((r) => r.durationMs));
  return <div className="timeline"><div className="chart-scale"><span>{max.toFixed(0)} ms</span><span>{(max / 2).toFixed(0)} ms</span><span>0 ms</span></div><div className="chart-body"><div className="chart-grid"><i /><i /><i /></div><div className="bars">{visible.map((row) => <button key={row.id} title={`${row.method}: ${formatMs(row.durationMs)}`} aria-label={`Select ${row.method}, ${formatMs(row.durationMs)}`} aria-pressed={selected === row.id} className={`bar ${row.outcome !== "ok" ? "bar-error" : `bar-${row.network}`}`} style={{ height: `${Math.max(3, row.durationMs / max * 100)}%` }} onClick={() => onSelect(row.id)} />)}</div><div className="chart-times"><span>{visible.length ? time(visible[0].recordedAt) : "Waiting for requests"}</span><span>{visible.length ? time(visible.at(-1)!.recordedAt) : ""}</span></div></div></div>;
}
