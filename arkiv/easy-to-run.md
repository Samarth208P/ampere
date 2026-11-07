# Easy to Run: Quickstart & Verification Guide

**Target Setup Time**: Under 4 minutes from git clone to live diagnostic telemetry.  
**Zero-External-Dependencies**: Requires no external database, cloud account, API key, or funded public wallet.

---

## 1. System Requirements

- **Operating System**: Linux, macOS, or Windows (via WSL2 or Git Bash).
- **Node.js**: `v22.16.0` or higher (`node -v`).
- **Package Manager**: `npm` (`npm -v`).
- **Container Runtime**: Docker Desktop or Docker Engine with Linux containers running (`docker info`).

---

## 2. 4-Minute Quickstart Sequence

Run the following commands in Git Bash or your terminal:

### Step 1: Install Dependencies
```bash
npm ci
```

### Step 2: Spin Up the Arkiv Reth Node
```bash
docker compose up -d
```
*Note: This starts the pinned `ghcr.io/arkiv-network/arkiv-reth` node on `http://127.0.0.1:8545` (Chain ID `1337`, `--dev`, 2-second block cadence).*

### Step 3: Run the Health Doctor
```bash
npm run doctor
```
*Expected Output:*
```
[PASS] Node.js engine meets >=22.16.0
[PASS] Docker container 'ampere-arkiv-1' is running
[PASS] Arkiv JSON-RPC responds on http://127.0.0.1:8545 (Chain ID 1337)
[PASS] File lock management (.ampere/writer.lock) operational
```

### Step 4: Seed Real Diagnostic Entities to Your Local Node
```bash
npm run arkiv:seed
```
*Mines a batch transaction containing 24 real entities directly via the Arkiv precompile (`0x44...44`) using the development key, verifies `EntityCreated` logs, and confirms read-back via `arkiv_query`.*

### Step 5: Collect Node Telemetry
```bash
# Run a single in-situ telemetry collection snapshot:
npm run collect

# Or start continuous collection in the background:
npm run collect:watch
```

### Step 6: Launch the Operator Web Console
```bash
npm run dev
```
Open **`http://127.0.0.1:3000/nodes`** in your browser.

---

## 3. What You Will See in the Console

1. **Node Health & Connectivity**: Connected status, client version (`arkiv-reth`), current block height, sync status (`eth_syncing: false`), and peer count (`net_peerCount: 0` on standalone devnet).
2. **Predictive Storage Forecasting**: Active bytes on `/data/golemdb`, free filesystem bytes, and projected days remaining before storage exhaustion.
3. **Critical Disk Alert Demonstration**: Toggle to **Example Mode** in the navigation header to view a simulated 3.5-day warning badge and alert banner.
4. **RPC Method Performance Matrix**: Real-time table displaying request count, failures, `p50`, and `p95` latencies for `arkiv_query`, `arkiv_getEntityCount`, and `eth_blockNumber`.
5. **Slow Query Benchmark**: Run `npm run arkiv:benchmark` to execute a bounded, zero-leakage benchmark against your seeded entities.
6. **Cryptographic Flight Log Export**: Click **Export Flight Log** to download a signed diagnostic bundle (`report.json`).

---

## 4. Validating the Installation

To verify that the entire test suite and build pipeline pass:
```bash
# Run unit tests and typecheck (18/18 tests pass):
npm run check

# Verify cryptographic flight log integrity:
npm run verify .ampere/report.json
```

---

## 5. What to Do When It Fails (Troubleshooting Matrix)

| Observed Error | Root Cause | Remediation Procedure |
| :--- | :--- | :--- |
| **`connect ECONNREFUSED 127.0.0.1:8545`** | The Arkiv Docker container is not running or still initializing. | Run `docker compose ps` and `docker compose logs arkiv --tail 30`. Wait 5 seconds for block generation to start. |
| **`Port 8545 is already in use`** | Another Ethereum node or previous process is binding port 8545. | Run `docker compose down`, check for lingering processes via `lsof -i :8545` (or `netstat -ano \| findstr 8545` on Windows), and restart via `docker compose up -d`. |
| **`Active writer lock conflict: .ampere/writer.lock`** | A previous collector or benchmark process crashed ungracefully. | Verify no background collector is active (`ps aux \| grep collect`). Safely delete `.ampere/writer.lock` and retry. |
| **`RPC Error -32006: state for this block is not retained`** | Historical query executed against a pruned block. | Run `npm run arkiv:benchmark` (which queries `latest`) instead of `--fixed-block`. See details in [arkiv/friction.md](friction.md). |
| **`Container resource gauges show 'Unavailable'`** | Docker stats command failed or container name does not match. | Verify `docker stats --no-stream` works. If your container has a custom name, export `ARKIV_CONTAINER=<name>`. |
| **`Chain ID mismatch: Expected 1337, got X`** | Targeting a foreign RPC endpoint instead of the local dev node. | AMPERE enforces loopback safety to prevent accidental mutation of public networks. Ensure `ARKIV_RPC_URL="http://127.0.0.1:8545"`. |
