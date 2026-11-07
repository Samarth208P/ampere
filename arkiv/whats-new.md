# What's New: Beyond External Dashboards

**Core Value Proposition**: AMPERE is not an external network observer or a collection of stock Grafana/Prometheus widgets. It is an **in-situ infrastructure flight recorder and zero-leakage slow query diagnostic engine** designed specifically for nodes running `arkiv-reth`.

---

## 1. Deep Contrast: External Probes vs. AMPERE In-Situ Collector

[nodes.arkiv.network](https://nodes.arkiv.network/) serves an important purpose: it monitors the health of the community network from the *outside*. However, external vantage points suffer from fundamental architectural blind spots:

| Capability / Metric | External Observers (e.g. `nodes.arkiv.network`) | Standard Node Built-ins (e.g. `arkiv-reth` JSON-RPC) | AMPERE In-Situ Flight Recorder |
| :--- | :---: | :---: | :---: |
| **Observation Vantage** | Remote Internet HTTP client | Localhost JSON-RPC listener | **Co-located host sidecar / Docker daemon socket** |
| **Storage Runway Forecasting** | ❌ Cannot see host filesystem | ❌ No disk rate-of-growth modeling | **✅ Direct `/data` sampling + linear regression days-to-full forecast** |
| **Container Resource Telemetry** | ❌ No visibility | ❌ Reth does not report OS cgroups | **✅ Docker stats CPU %, RSS memory, Block I/O, PID count** |
| **Per-Method Latency Profiling** | ⚠️ Global HTTP ping only | ⚠️ Single-request execution | **✅ Disaggregated `p50`/`p95` per RPC method (`arkiv_query`, etc.)** |
| **Error Classification** | ❌ Binary UP/DOWN | ⚠️ Raw JSON-RPC error codes | **✅ Distinguishes network timeout, transport failure, & node errors** |
| **Slow Query Profiling** | ❌ Forbidden (would DoS public node) | ❌ No built-in benchmark harness | **✅ Controlled private benchmark on owned node with circuit breaker** |
| **Workload Privacy Boundary** | N/A | N/A | **✅ Opaque `workloadId` hashes prevent leaking private queries** |
| **Cryptographic Tamper-Evidence**| ❌ Unsigned ephemeral pings | ❌ No signed telemetry format | **✅ RFC 8785 canonical JSON + Ed25519 digital signatures** |

---

## 2. What Does It Reveal That Built-In Tools Do Not?

1. **Storage Exhaustion Early Warning**:
   Standard `arkiv-reth` has no built-in awareness of how fast its `/data/golemdb` directory is expanding relative to the host filesystem. It simply appends writes until the OS throws `ENOSPC`, which immediately crashes the node and can corrupt the database. AMPERE calculates real-time write velocity and alerts operators at the $< 7$ day critical threshold.

2. **Per-Method RPC Micro-Diagnostics**:
   A node may report that it is "healthy" and responding to `eth_blockNumber`, while queries to `arkiv_query` with complex predicates are quietly stalling or returning `-32006` errors. AMPERE tracks each method independently, ensuring that query degradation cannot hide behind lightweight block pings.

3. **Separation of Network Lag from Node Processing Time**:
   By executing directly on the loopback interface (`127.0.0.1:8545`), AMPERE eliminates internet routing jitter, TLS handshake overhead, and CDN caching, isolating pure node execution latency.

---

## 3. Why It Is More Than "Putting an Existing Dashboard Together"

AMPERE does not merely wire up Prometheus exporters to Grafana dashboards. It introduces four novel architectural contributions:

### A. The Zero-Leakage Query Privacy Boundary
Node operators must benchmark query latency under stress without leaking proprietary database schemas, private entity keys, or potential denial-of-service query shapes. AMPERE's benchmark harness (`scripts/benchmark-arkiv.ts`):
- Assigns deterministic, random UUIDs (`workloadId`) to distinct query shapes.
- Stores raw queries in an untracked, local-only file (`.ampere/benchmark-*.private.json`).
- Exposes only the anonymous `workloadId`, duration, block number, and outcome in public flight logs.
- Enforces isolated baselines: two queries with different shapes never share a latency baseline.

### B. Intelligent Circuit-Breaker Benchmarking
Standard load-testing tools (k6, Locust, ApacheBench) indiscriminately flood targets with concurrent traffic until failure. AMPERE's harness is engineered for delicate state-database testing:
- **Strict Concurrency Limit**: Runs sequentially (concurrency = 1) with bounded request counts ($\le 40$).
- **Dynamic Circuit Breaker**: If any query iteration takes $> 1,000 \text{ ms}$ or returns an RPC error, the benchmark halts immediately, preserving failure telemetry without risking node crash or lock escalation.

### C. Cryptographically Verifiable Diagnostic Flight Logs
When submitting a bug or performance regression to Arkiv core developers, trust is paramount. AMPERE signs every exported diagnostic record using RFC 8785 Canonical JSON and Ed25519 cryptography:
```
Diagnostic State ──> RFC 8785 Canonicalization ──> SHA-256 Digest ──> Ed25519 Sign ──> Sealed Flight Log
```
Arkiv engineers can run `npm run verify report.json` to prove mathematically that timestamps, latency percentiles, and error codes were not altered or cherry-picked by the operator.

### D. Zero-Hosted-Database Architecture
AMPERE requires no external Postgres, InfluxDB, or Redis instance. It maintains an atomic, memory-efficient bounded ring buffer of 1,000 observations backed by crash-resilient local filesystem locks (`.ampere/writer.lock`), allowing it to run effortlessly in minimal bare-metal or Dockerized edge environments.
