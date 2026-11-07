import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const assetsDir = path.resolve("docs/assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const logoBase64 = fs.readFileSync("docs/assets/logo-512.png").toString("base64");
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  // 1. Generate 16:9 Cover Banner (1280x720)
  console.log("Generating 16:9 Cover Banner...");
  const bannerPage = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  const bannerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 720px;
    background: radial-gradient(circle at 80% 20%, #033c38 0%, #012624 45%, #001312 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
    color: #edfffe;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 80px;
    position: relative;
    overflow: hidden;
  }
  /* Ambient grid & glow */
  .grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(94, 234, 212, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(94, 234, 212, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    pointer-events: none;
  }
  .glow-orb {
    position: absolute;
    right: 120px;
    top: 50%;
    transform: translateY(-50%);
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(1, 38, 36, 0) 70%);
    border-radius: 50%;
    filter: blur(40px);
    pointer-events: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 2;
  }
  .logo {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    border: 1px solid rgba(94, 234, 212, 0.3);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .brand-text {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #edfffe;
  }
  .badge {
    background: rgba(94, 234, 212, 0.12);
    border: 1px solid rgba(94, 234, 212, 0.3);
    color: #5eead4;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .main-content {
    z-index: 2;
    max-width: 760px;
  }
  h1 {
    font-size: 64px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -2px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #ffffff 0%, #b2f5ea 60%, #5eead4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p.subtitle {
    font-size: 22px;
    line-height: 1.45;
    color: #a7f3d0;
    font-weight: 400;
    margin-bottom: 32px;
    opacity: 0.9;
  }
  .tagline-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(4, 47, 46, 0.7);
    border: 1px solid rgba(94, 234, 212, 0.2);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    color: #e6fffa;
    backdrop-filter: blur(10px);
  }
  .pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px #34d399;
  }
  .right-visual {
    position: absolute;
    right: 80px;
    top: 50%;
    transform: translateY(-50%);
    width: 380px;
    background: rgba(3, 27, 26, 0.85);
    border: 1px solid rgba(94, 234, 212, 0.25);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    backdrop-filter: blur(16px);
    z-index: 2;
  }
  .telemetry-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(94, 234, 212, 0.1);
    font-size: 14px;
  }
  .telemetry-row:last-child { border-bottom: none; }
  .telemetry-label { color: #81e6d9; opacity: 0.8; font-size: 13px; }
  .telemetry-value { font-family: monospace; font-weight: 600; color: #ffffff; }
  .status-tag {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }
  .status-active { background: rgba(52, 211, 153, 0.2); color: #34d399; }
  .status-alert { background: rgba(248, 113, 113, 0.2); color: #f87171; }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #81e6d9;
    opacity: 0.7;
    z-index: 2;
    border-top: 1px solid rgba(94, 234, 212, 0.15);
    padding-top: 20px;
  }
</style>
</head>
<body>
<div class="grid"></div>
<div class="glow-orb"></div>

<div class="header">
  <img src="${logoDataUri}" class="logo" alt="AMPERE Logo" />
  <span class="brand-text">AMPERE</span>
  <span class="badge">ETHGlobal Mumbai</span>
</div>

<div class="main-content">
  <h1>Infrastructure Flight Recorder</h1>
  <p class="subtitle">Real-time node telemetry, predictive disk forecasting, and EIP-8141 frame transaction admission tracing.</p>
  <div class="tagline-pills">
    <div class="pill"><span class="pill-dot"></span> Arkiv-Reth Operator Dashboard</div>
    <div class="pill"><span class="pill-dot"></span> EIP-8141 / ERC-8421 Alt-Mempool</div>
    <div class="pill"><span class="pill-dot"></span> SHA-256 + Ed25519 Verifiable Evidence</div>
  </div>
</div>

<div class="right-visual">
  <div style="font-size: 13px; font-weight: 700; color: #5eead4; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Flight Diagnostics Monitor</div>
  <div class="telemetry-row">
    <span class="telemetry-label">Node Target</span>
    <span class="telemetry-value">arkiv-reth:dev (1337)</span>
  </div>
  <div class="telemetry-row">
    <span class="telemetry-label">Disk Saturation</span>
    <span class="status-tag status-alert">Alert: &lt; 7.0 Days</span>
  </div>
  <div class="telemetry-row">
    <span class="telemetry-label">RPC Median p95</span>
    <span class="telemetry-value">12.4 ms</span>
  </div>
  <div class="telemetry-row">
    <span class="telemetry-label">EIP-8141 Frames</span>
    <span class="telemetry-value">[VERIFY, SENDER]</span>
  </div>
  <div class="telemetry-row">
    <span class="telemetry-label">ERC-7562 Rules</span>
    <span class="status-tag status-active">Admitted: Validated</span>
  </div>
</div>

<div class="footer">
  <span>MIT Open Source · Canonical Evidence Engine</span>
  <span>Built for Arkiv Node Operators & Ethereum EF Alt-Mempool</span>
</div>
</body>
</html>
  `;

  await bannerPage.setContent(bannerHtml);
  await bannerPage.screenshot({
    path: path.join(assetsDir, "cover-image-16x9.png"),
  });
  // Also copy to public/brand for easy web access
  fs.copyFileSync(
    path.join(assetsDir, "cover-image-16x9.png"),
    "public/brand/cover-image-16x9.png"
  );
  await bannerPage.close();

  // 2. Generate High-Res Architecture Diagram (1440x900)
  console.log("Generating High-Res Architecture Diagram...");
  const archPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const archHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1440px;
    height: 900px;
    background: #011d1c;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
    color: #edfffe;
    padding: 50px 70px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }
  .grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(94, 234, 212, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(94, 234, 212, 0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .arch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(94, 234, 212, 0.2);
    padding-bottom: 24px;
    z-index: 2;
  }
  .title-group h1 {
    font-size: 34px;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #5eead4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title-group p {
    font-size: 16px;
    color: #81e6d9;
    margin-top: 6px;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 30px;
    margin: 30px 0;
    z-index: 2;
    flex: 1;
  }
  .card {
    background: rgba(3, 34, 33, 0.85);
    border: 1px solid rgba(94, 234, 212, 0.25);
    border-radius: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.5);
  }
  .card-badge {
    align-self: flex-start;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-arkiv { background: rgba(56, 178, 172, 0.2); color: #38b2ac; border: 1px solid rgba(56, 178, 172, 0.4); }
  .badge-ef { background: rgba(129, 140, 248, 0.2); color: #818cf8; border: 1px solid rgba(129, 140, 248, 0.4); }
  .badge-evidence { background: rgba(52, 211, 153, 0.2); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); }

  .card-title {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
  }
  .node-step {
    background: rgba(1, 22, 21, 0.9);
    border: 1px solid rgba(94, 234, 212, 0.15);
    border-radius: 8px;
    padding: 14px;
    font-size: 13px;
  }
  .node-step strong {
    display: block;
    color: #5eead4;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .node-step p {
    color: #cbd5e1;
    line-height: 1.4;
  }
  .arrow-down {
    text-align: center;
    color: #5eead4;
    font-weight: bold;
    font-size: 16px;
    margin: -6px 0;
    opacity: 0.7;
  }
  .arch-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(94, 234, 212, 0.2);
    padding-top: 20px;
    font-size: 14px;
    color: #81e6d9;
    z-index: 2;
  }
</style>
</head>
<body>
<div class="grid"></div>

<div class="arch-header">
  <div class="title-group">
    <h1>AMPERE — System Architecture & Data Flow</h1>
    <p>Bridging In-Situ Database Node Telemetry with EIP-8141 Alternative Mempool Admission</p>
  </div>
  <div style="font-family: monospace; font-size: 14px; color: #5eead4; background: rgba(94,234,212,0.1); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(94,234,212,0.25);">
    v0.1.0 · Local-First Architecture
  </div>
</div>

<div class="columns">
  <!-- Pillar 1: Arkiv Node Observer -->
  <div class="card">
    <span class="card-badge badge-arkiv">Arkiv Tooling Track</span>
    <h2 class="card-title">In-Situ Node Observer</h2>

    <div class="node-step">
      <strong>1. Host Container Telemetry</strong>
      <p>Direct Docker Engine cgroups socket queries: container CPU %, RSS memory vs limits, block I/O counters.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>2. Linear Disk Exhaustion Model</strong>
      <p>Tracks /data volume block growth over 60s windows; projects time-to-full with automated alert below 7 days.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>3. Private Workload Profiler</strong>
      <p>Loopback-only benchmark client with 2s timeout and redirect rejection. Hashes query shapes into opaque IDs in .ampere/.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>4. Direct ABI State Verification</strong>
      <p>Bypasses SDK mismatch; writes directly to execute(Operation[]) at 0x44...44 with dual-layer log & read-back checks.</p>
    </div>
  </div>

  <!-- Pillar 2: EIP-8141 Alt Mempool Tracer -->
  <div class="card">
    <span class="card-badge badge-ef">Alt-Mempool Track</span>
    <h2 class="card-title">Frame Admission Tracer</h2>

    <div class="node-step">
      <strong>1. Multi-Frame Construction</strong>
      <p>Uses @forshtat/hegota-support (ethrex tracer) to craft [VERIFY] (30k gas) and [SENDER] (50k gas) frames.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>2. Pre-Flight Hash Locking</strong>
      <p>Calculates txHash locally and writes an atomic lock to disk before wire dispatch, surviving network drops.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>3. Bundler Gateway Dispatch</strong>
      <p>Sends wire transaction via eth_sendFrameTransaction to Skandha bundler gateway on chain 1337.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>4. Deep Rule Verdict Tracing</strong>
      <p>Queries skandha_explorer_getTransaction to parse up to 200 ERC-7562 opcode/storage checks and lifecycle states.</p>
    </div>
  </div>

  <!-- Pillar 3: Flight Recorder & Verifiable Evidence -->
  <div class="card">
    <span class="card-badge badge-evidence">Integrity & Console</span>
    <h2 class="card-title">Verifiable Flight Recorder</h2>

    <div class="node-step">
      <strong>1. Bounded JSON-RPC Sampling</strong>
      <p>Maintains rolling 1,000 request ring buffer with p50/p95 latency, byte counts, and outcome codes.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>2. Canonical JSON Serialization</strong>
      <p>Normalizes observations, container snapshots, and rule verdicts into deterministic canonical JSON format.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>3. Ed25519 Cryptographic Signing</strong>
      <p>Generates SHA-256 digest signed with local Ed25519 private key; portable and independently verifiable.</p>
    </div>
    <div class="arrow-down">↓</div>
    <div class="node-step">
      <strong>4. Local Next.js + Netlify Relay</strong>
      <p>Air-gapped local dashboard with optional outbound HTTPS signed snapshot relay to hosted Netlify console.</p>
    </div>
  </div>
</div>

<div class="arch-footer">
  <span>Node Target: arkiv-reth:dev · Alt Mempool Gateway: altmempoolgateway.forshtat.com</span>
  <span>Open-Source MIT License · Zero External Database Dependencies</span>
</div>
</body>
</html>
  `;

  await archPage.setContent(archHtml);
  await archPage.screenshot({
    path: path.join(assetsDir, "architecture-diagram.png"),
  });
  // Also copy to public/brand
  fs.copyFileSync(
    path.join(assetsDir, "architecture-diagram.png"),
    "public/brand/architecture-diagram.png"
  );
  await archPage.close();

  await browser.close();
  console.log("Cover image and architecture diagram generated successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

