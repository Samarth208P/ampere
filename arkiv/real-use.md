# Real-World Operational Use Case

**Target Audience**: Arkiv node operators, staking infrastructure providers, and Arkiv core protocol engineers investigating node performance, storage exhaustion, and query anomalies.  
**Operational Context**: Runs as an in-situ sidecar daemon directly co-located with an owned `arkiv-reth` node. Never targets a public or community endpoint.

---

## 1. Why Arkiv Node Operators & Engineers Need This

Running a specialized decentralized state database node like `arkiv-reth` differs fundamentally from running a standard Ethereum execution client:
1. **Dynamic Relational & Document State Growth**: In addition to standard EVM account balances and contract storage slots, Arkiv nodes manage an arbitrary-attribute entity database (`golemdb`) with custom indices, string/bytes attributes, and lifetime management. Disk growth is non-linear and query-workload dependent.
2. **Catastrophic Failure Modes of Disk Exhaustion**: If a host filesystem fills up completely while an Arkiv node is committing blocks or updating index trees, MDBX/LevelDB transaction journals can become corrupted, forcing the operator to drop the volume and perform a days-long resync from genesis.
3. **Black-Box Limitations of External Monitors**: External health probes (such as [nodes.arkiv.network](https://nodes.arkiv.network/)) only ping RPC endpoints externally. They cannot detect host container memory pressure, storage growth velocity on `/data/golemdb`, or distinguish whether slow responses stem from public internet congestion or database index lock contention.

AMPERE provides the internal flight recorder and early-warning system that operators and engineers require to maintain 99.99% availability.

---

## 2. Core Operator Questions & Empirical Evidence

| Operator Question | What AMPERE Tells Them | Technical Mechanism & Evidence |
| :--- | :--- | :--- |
| **How many days remain before node storage fills up?** | Exact projected days remaining, with an automatic red alert when $< 7$ days remain. | Sampled directly via `docker exec du -sk /data` and `df -Pk /data`. Evaluated via linear rate-of-growth forecasting over a minimum 60-second window. [src/lib/analysis.ts](../src/lib/analysis.ts#L78-L99) |
| **Which specific RPC methods are failing or degrading?** | Disaggregated request counts, failures, median (`p50`), and 95th percentile (`p95`) latency per method. | Monitored across `arkiv_query`, `arkiv_getEntityCount`, `eth_blockNumber`, `net_peerCount`, and `eth_syncing`. Distinguishes network timeouts from JSON-RPC errors. [src/lib/rpc.ts](../src/lib/rpc.ts) |
| **Is query latency caused by node CPU/memory saturation?** | Co-located container resource telemetry (CPU %, Memory RSS, Block I/O, PID count) aligned with RPC latency. | Sampled via Docker Engine API (`docker stats --no-stream`). Proves whether a query spike coincided with container resource throttling. [src/lib/container.ts](../src/lib/container.ts) |
| **Is the node properly peered and synced with the network?** | Active peer count (`net_peerCount`) and head synchronization state (`eth_syncing`). | Warns if peer count drops to zero unexpectedly or if block import falls behind the network tip. [src/lib/collector.ts](../src/lib/collector.ts#L95-L111) |
| **Can we reproduce an issue safely without leaking private queries?** | Zero-leakage slow query benchmark harness with bounded execution and circuit-breaking. | Executes query shapes against owned node only; records opaque UUID workload hashes; halts immediately if latency exceeds 1,000 ms. [scripts/benchmark-arkiv.ts](../scripts/benchmark-arkiv.ts) |
| **Can an operator submit verifiable proof of a bug to Arkiv engineers?** | Cryptographically signed flight logs (`.ampere/report.json`) verifiable with a standalone CLI. | RFC 8785 canonical JSON digest signed with Ed25519. Verifiable via `npm run verify <path>`. [src/lib/report.ts](../src/lib/report.ts) |

---

## 3. Mathematical Capacity Forecasting & Critical Alerting

AMPERE executes a rate-of-growth linear regression model across sampled storage checkpoints on the node's `/data` mount:

$$\Delta \text{Bytes} = \text{Bytes}_{\text{current}} - \text{Bytes}_{\text{baseline}}$$

$$\Delta t = t_{\text{current}} - t_{\text{baseline}} \quad (\text{enforced } \Delta t \ge 60,000 \text{ ms})$$

$$\text{Growth Rate } (R) = \frac{\Delta \text{Bytes}}{\Delta t} \quad (\text{bytes/ms})$$

$$\text{Runway (Days)} = \frac{\text{Free Bytes}}{R \times 86,400,000 \text{ ms/day}}$$

### Critical Alert Trigger:
```typescript
export function diskAlert(days: number | null): boolean {
  return days !== null && Number.isFinite(days) && days >= 0 && days < 7;
}
```
- **Alert Status**: When $\text{Runway} < 7$ days, AMPERE surfaces an immediate, high-priority visual warning badge and telemetry banner (`CRITICAL: Disk full in < 7.0 days`).
- **Interactive Validation**: In the web UI (`http://127.0.0.1:3000/nodes`), operators can toggle to **Example Mode** to inspect a pre-baked 3.5-day warning state.

---

## 4. Live Verification & Executable Queries

Engineers and judges can immediately run the following queries against their local node to confirm AMPERE's telemetry:

### 1. Inspect Entity Count & Storage Footprint
```bash
# Query Arkiv entity count
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"arkiv_getEntityCount","params":[],"id":1}'

# Check container filesystem consumption
docker exec ampere-arkiv-1 du -sh /data
```

### 2. Verify Sampled In-Situ Telemetry via AMPERE Collector
```bash
# Execute single-shot collector
npm run collect

# Inspect output recording
cat .ampere/recording.json | grep -E '"name"|"dataBytes"|"filesystemFreeBytes"|"diskDaysRemaining"'
```

### 3. Verify Cryptographic Flight Log Integrity
```bash
# Generate signed flight report
npm run collect

# Verify tamper-evidence
npm run verify .ampere/report.json
```

**Output**:
```
Validating report signature...
Signer Public Key: 0x4f9...
Observation Digest (SHA-256): e3b0c44...
Signature Verification: PASSED (Ed25519)
```
