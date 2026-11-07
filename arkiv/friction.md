# Arkiv Node & Query Friction Report

**Evaluation Context**: Tested against `arkiv-reth` pinned by container image digest `sha256:83d58d3d79c7d1a3e3b95cc94f2d9baa37cb2801d1cda6753727de46a8688a31` (Chain ID `1337`, `--dev`, 2s block cadence).  
**Upstream Codebase Reference**: `Arkiv-Network/arkiv` (`crates/arkiv-bindings`, `crates/arkiv-precompiles`, `crates/arkiv-storage`).  
**Privacy Boundary**: Per track evaluation rules, no proprietary or sensitive slow-query shapes are disclosed here. Slow query shape telemetry is retained privately within `.ampere/benchmark-*.private.json` and presented directly at the Arkiv booth.

---

## 1. SDK vs. Node Precompile Write Surface Inconsistency

### What Got in Our Way
During development of the node seeding and verification harness, writes dispatched using the official `@arkiv-network/sdk@0.7.0` (`mutateEntities`) returned deceptive transaction receipts: the EVM transaction succeeded (`status: 0x1`), consumed gas, but resulted in **zero entities created in the underlying database**.

### Expected Behavior
Either:
1. The SDK's transaction executes against the node and creates the expected 24 entities with corresponding `EntityCreated` event logs; OR
2. If the node's precompile interface has evolved or differs from SDK v0.7.0, the transaction should immediately revert with an explicit revert reason (e.g., `InvalidPrecompileTarget` or `MalformedOperationData`), alerting the developer to the interface mismatch before state verification.

### Observed Behavior
- **Transaction Hash**: `0x10e9763d900a04330eb9ea0930769dc6e6f3726ad7ab5848f678f6ca7cc134c8`
- **Receipt Status**: `0x1` (Success)
- **Event Logs Emitted**: `0` logs (`receipt.logs.length === 0`)
- **Entities Written**: `0` (read-back via `arkiv_query` returned `[]`)

### Root Cause Analysis
- **SDK Target & Encoding**: `@arkiv-network/sdk@0.7.0` dispatches compressed RLP-encoded mutation payloads to magic address `0x00000000000000000000000000000061726b6976` (ASCII hex for `"arkiv"`).
- **Node Precompile Implementation**: In the pinned `arkiv-reth` node binary (`crates/arkiv-bindings/src/lib.rs`), the state registry precompile is deployed at:
  ```
  0x4400000000000000000000000000000000000044
  ```
  and expects standard Solidity ABI-encoded parameters for:
  ```solidity
  struct Operation { uint8 operation; bytes operationData; }
  function execute(Operation[] ops) returns (bytes32[] keys);
  ```
  Because the destination address `0x...61726b6976` had no contract bytecode deployed on the standalone dev node, EVM execution treated the call as a standard transfer to an empty account—succeeding without error while silently dropping all entity mutations.

### Exact Reproduction
1. Start the pinned Arkiv Reth node via `docker compose up -d`.
2. Execute a transaction using `@arkiv-network/sdk@0.7.0` using the public development account `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`:
   ```typescript
   import { ArkivClient } from "@arkiv-network/sdk";
   const client = new ArkivClient({ endpoint: "http://127.0.0.1:8545" });
   const tx = await client.mutateEntities([{ type: "create", ... }]);
   const receipt = await client.waitForTransaction(tx.hash);
   console.log("Status:", receipt.status, "Logs:", receipt.logs.length);
   // Prints: Status: 1 Logs: 0
   ```
3. Query the node via JSON-RPC:
   ```bash
   curl -s -X POST http://127.0.0.1:8545 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"arkiv_getEntityCount","params":[],"id":1}'
   ```
   **Result**: Counter remains unchanged (`0x0`).

### Recommended Improvements for Arkiv Core Team
1. **Node Address Routing**: Route `0x00000000000000000000000000000061726b6976` as an internal alias/precompile stub that either forwards to `0x44...44` or explicitly reverts with a diagnostic error code.
2. **SDK Compatibility Matrix**: Publish a clear compatibility matrix in `docs.arkiv.network` mapping `@arkiv-network/sdk` releases to specific `arkiv-reth` node tags/commit hashes.
3. **AMPERE Safeguard**: AMPERE bypasses this divergence by targeting `0x44...44` directly with raw ABI encoding via Viem, followed by mandatory dual-assertion (verifying both the `EntityCreated` receipt logs and an immediate `arkiv_query` read-back).

---

## 2. Historical Query Error `-32006` Despite `ARKIV_STORE_HISTORY=128`

### What Got in Our Way
During repeatable fixed-block benchmark runs, querying historical state across a fixed block identifier (`atBlock: "0x16c"`) initially succeeded for four iterations, but subsequently failed with JSON-RPC error `-32006`: `block 364 is unavailable: state for this block is not retained`.

### Expected Behavior
With the node started using `ARKIV_STORE_HISTORY="128"` (as confirmed by node startup logs: `history=Blocks(128)`), blocks within the preceding 128 block window should remain queryable. At the time of failure, `eth_blockNumber` was `0x18c` (block 396), meaning block 364 was only 32 blocks behind the tip—well within the configured 128-block retention window.

### Observed Behavior
The node returned:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32006,
    "message": "block 364 is unavailable: state for this block is not retained"
  }
}
```

### Root Cause Analysis
The underlying storage volume (`/data/golemdb`) was initially initialized with default (head-only) retention. When `compose.yaml` was updated to `ARKIV_STORE_HISTORY=128`, the execution engine acknowledged the flag at runtime, but the pre-existing GolemDB state store did not back-fill or re-index historical state for blocks mined prior to the configuration restart. This caused a divergence between Reth's block store (which had the block header) and GolemDB's state snapshot manager.

### Exact Reproduction
1. Start the node with head-only retention, seed 24 entities, and allow 50 blocks to mine.
2. Restart the container with `ARKIV_STORE_HISTORY=128`.
3. Query historical state at the earlier block:
   ```bash
   curl -s -X POST http://127.0.0.1:8545 \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "arkiv_query",
       "params": [
         "dataset = str(\"ampere-seed\")",
         { "limit": 10, "atBlock": "0x16c" }
       ],
       "id": 1
     }'
   ```

### Recommended Improvements for Arkiv Core Team
1. **Dynamic Retention Query RPC**: Expose an RPC method such as `arkiv_getRetentionState` returning:
   ```json
   { "retentionPolicy": "blocks", "configuredWindow": 128, "earliestQueryableBlock": "0x170", "tipBlock": "0x18c" }
   ```
   This allows indexing clients and dApps to detect the exact boundary without incurring error `-32006`.
2. **Startup Volume Validation**: On startup, if `ARKIV_STORE_HISTORY` exceeds the historical depth recorded in the GolemDB manifest, emit an explicit log warning: `WARN: GolemDB state store history depth (0) lags node configuration (128). Existing blocks may be non-queryable.`
3. **AMPERE Safeguard**: AMPERE's benchmark harness includes both a `--fixed-block` mode (which catches this exact retention error and gracefully captures it in the flight recorder) and a default moving-head mode (`atBlock: "latest"`).

---

## 3. Operational Observability Gaps in Standalone Nodes

### What Is Missing Today
1. **No Fine-Grained Internal Query Metrics**: `arkiv-reth` exposes standard Ethereum RPCs (`eth_*`, `net_*`, `web3_*`), but lacks native Prometheus metrics for:
   - Precompile execution duration vs. database disk I/O.
   - Per-query predicate complexity profiling (e.g. string equality vs. range scan vs. regex).
   - Cache hit/miss rates in GolemDB.
2. **Black-Box Node Dashboards**: Current community explorers (e.g. `nodes.arkiv.network`) ping nodes externally from remote endpoints. When an operator's node slows down, external explorers only report high response latency or downtime. They cannot see:
   - Whether the slowdown is caused by CPU starvation, OS page cache exhaustion, or high disk I/O on `/data/golemdb`.
   - How many days remain before the host filesystem is exhausted.
3. **Absence of Tamper-Evident Incident Export**: When an operator experiences erratic node behavior, there is no standardized, privacy-preserving format to package diagnostic telemetry, error codes, and resource metrics to send to Arkiv engineers without exposing raw data payloads.

### How AMPERE Resolves This
- **In-Situ Co-Located Collector**: Collects container cgroup CPU/memory, `/data/golemdb` filesystem consumption, and method-by-method latency percentiles (`p50`, `p95`).
- **Predictive Storage Forecasting**: Computes linear storage depletion velocity over a minimum 60-second window, alerting when fewer than 7 days of disk capacity remain.
- **Signed Flight Logs**: Bundles diagnostic telemetry into an RFC 8785 canonical JSON payload cryptographically signed with an Ed25519 keypair, allowing Arkiv engineers to independently verify incident reports via `npm run verify`.
