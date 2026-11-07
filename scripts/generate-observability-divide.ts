import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const assetsDir = path.resolve("docs/assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 760 },
    deviceScaleFactor: 2,
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 760px;
    background: #011413;
    background: radial-gradient(circle at 50% 0%, #022a27 0%, #011615 50%, #000e0d 100%);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: #edfffe;
    padding: 36px 44px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Grid overlay */
  .grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(94, 234, 212, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(94, 234, 212, 0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }

  .glow-top {
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 650px;
    height: 240px;
    background: radial-gradient(circle, rgba(0, 210, 190, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(94, 234, 212, 0.15);
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .badge-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: linear-gradient(135deg, #00a89d, #5eead4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #012624;
    font-weight: 800;
    font-size: 15px;
    box-shadow: 0 0 16px rgba(94, 234, 212, 0.4);
  }

  .title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .tagline {
    font-size: 12px;
    color: #7dd3fc;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .content-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
    z-index: 2;
  }

  /* SECTION 1: Traditional Explorers */
  .section-label {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #94a3b8;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-label::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #64748b;
  }

  .traditional-row {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 16px;
    position: relative;
  }

  .node-box {
    flex: 1;
    background: rgba(1, 29, 28, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
  }

  .node-box.amber {
    border-color: rgba(251, 146, 60, 0.35);
    background: rgba(251, 146, 60, 0.04);
  }

  .node-box-title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .node-box-sub {
    font-size: 12px;
    color: #cbd5e1;
    opacity: 0.8;
  }

  /* RPC pipeline middle */
  .rpc-pipeline {
    width: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 6px 12px;
  }

  .pipe-title {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7dd3fc;
    margin-bottom: 6px;
    font-weight: 600;
  }

  .pipe-arrow-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 11px;
    font-family: ui-monospace, monospace;
    background: rgba(0, 0, 0, 0.3);
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px dashed rgba(125, 211, 252, 0.25);
  }

  .arrow-forward {
    color: #38bdf8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .arrow-backward {
    color: #f87171;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Blind spot dropdown */
  .blind-spot-card {
    margin-top: 10px;
    width: 100%;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
  }

  .blind-spot-header {
    font-size: 11px;
    font-weight: 700;
    color: #fca5a5;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .blind-spot-list {
    list-style: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 10px;
    font-size: 11px;
    color: #fecaca;
  }

  .blind-spot-list li::before {
    content: "• ";
    color: #f87171;
    font-weight: bold;
  }

  /* SECTION 2: AMPERE In-Situ Diagnostic Pipeline */
  .ampere-section {
    margin-top: 6px;
  }

  .ampere-label {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #5eead4;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ampere-label::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2dd4bf;
    box-shadow: 0 0 8px #2dd4bf;
  }

  .ampere-card {
    background: rgba(0, 40, 37, 0.65);
    border: 1px solid rgba(45, 212, 191, 0.4);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(94, 234, 212, 0.2);
    border-radius: 8px;
    padding: 16px 20px;
  }

  .ampere-card-header {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(45, 212, 191, 0.2);
    padding-bottom: 8px;
  }

  .ampere-pill {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(45, 212, 191, 0.15);
    color: #5eead4;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(45, 212, 191, 0.3);
  }

  .pipeline-tree {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12.5px;
    line-height: 1.45;
  }

  .tree-row {
    display: flex;
    align-items: baseline;
    color: #d1fae5;
  }

  .tree-branch {
    color: #2dd4bf;
    font-weight: bold;
    margin-right: 8px;
    user-select: none;
  }

  .tree-label {
    color: #ffffff;
    font-weight: 600;
  }

  .tree-detail {
    color: #99f6e4;
    margin-left: 6px;
    font-weight: 400;
  }

  /* Footer */
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #5eead4;
    opacity: 0.7;
    border-top: 1px solid rgba(94, 234, 212, 0.12);
    padding-top: 8px;
    position: relative;
    z-index: 2;
  }
</style>
</head>
<body>
<div class="grid"></div>
<div class="glow-top"></div>

<!-- Top Bar -->
<div class="header-bar">
  <div class="title-group">
    <div class="badge-icon">⚡</div>
    <div class="title">The Observability Divide</div>
  </div>
  <div class="tagline">External Black-Box Monitoring vs. In-Situ Node Diagnostics</div>
</div>

<div class="content-container">

  <!-- Section 1: Traditional Public Explorers -->
  <div class="traditional-section">
    <div class="section-label">Traditional Public Explorers (External Perspective)</div>
    <div class="traditional-row">
      <!-- Left Box -->
      <div class="node-box">
        <div class="node-box-title">External Block Tracker</div>
        <div class="node-box-sub">(Mined State Only)</div>
      </div>

      <!-- Center Pipeline & Blind Spot -->
      <div class="rpc-pipeline">
        <div class="pipe-title">RPC Pipeline</div>
        <div class="pipe-arrow-row">
          <div class="arrow-forward">
            <span>─── [Opaque JSON-RPC]</span>
            <span>───►</span>
          </div>
          <div class="arrow-backward">
            <span>◄── [Opaque Rejection]</span>
            <span>───</span>
          </div>
        </div>

        <div class="blind-spot-card">
          <div class="blind-spot-header">▲ Diagnostic Blind Spot</div>
          <ul class="blind-spot-list">
            <li>Container cgroup saturation</li>
            <li>Silent precompile failures</li>
            <li>Unlogged ERC-7562 opcode drops</li>
            <li>Predictive disk exhaustion</li>
          </ul>
        </div>
      </div>

      <!-- Right Box -->
      <div class="node-box amber">
        <div class="node-box-title">Node / Bundler Core</div>
        <div class="node-box-sub">(Internal State Masked)</div>
      </div>
    </div>
  </div>

  <!-- Section 2: AMPERE In-Situ Diagnostic Pipeline -->
  <div class="ampere-section">
    <div class="ampere-label">AMPERE In-Situ Diagnostic Pipeline (Internal Perspective)</div>
    <div class="ampere-card">
      <div class="ampere-card-header">
        <span>AMPERE Daemon (Sidecar / In-Situ Engine)</span>
        <span class="ampere-pill">Low-Overhead &middot; Loopback Isolated &middot; Tamper-Evident</span>
      </div>

      <div class="pipeline-tree">
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Linux cgroups & Host VFS Monitoring</span>
          <span class="tree-detail">(Disk Burn-Rate Linear Regression)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Granular RPC Method Latency Distributions</span>
          <span class="tree-detail">(p50 / p95 Profiling)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Zero-Knowledge Private Query Benchmarks</span>
          <span class="tree-detail">(Loopback-Enforced Opaque IDs)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Dual-Assertion Precompile State Verification</span>
          <span class="tree-detail">(Receipt Events + Read-Back)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Multi-Frame Wire Serializer & Pre-Flight Hash Locking</span>
          <span class="tree-detail">(EIP-8141 Assembly)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">├──</span>
          <span class="tree-label">Skandha Sidecar Admission Tracing</span>
          <span class="tree-detail">(Discrete ERC-7562 Rule Checks)</span>
        </div>
        <div class="tree-row">
          <span class="tree-branch">└──</span>
          <span class="tree-label">Deterministic Canonicalization</span>
          <span class="tree-detail">(RFC-8785) & Ed25519 Signed Flight Records</span>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- Footer -->
<div class="footer-bar">
  <span>Node Sidecar Telemetry & Native Multi-Frame Trace Engine</span>
  <span>AMPERE Diagnostic Infrastructure</span>
</div>

</body>
</html>
  `;

  await page.setContent(html);
  const outputPath = path.join(assetsDir, "observability-divide.png");
  await page.screenshot({
    path: outputPath,
  });

  // Also copy to public/brand
  fs.copyFileSync(outputPath, "public/brand/observability-divide.png");
  await browser.close();

  console.log(`Saved clean image to: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
