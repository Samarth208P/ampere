# Initial validation — 2026-11-06

Environment: Windows PowerShell, Node 22.16.0, Docker Desktop Linux engine 29.5.3.

## Observed live

- Local Arkiv container starts from the pinned image; chain 1337; peers 0; synced.
- EF gateway responds to chain ID, block number and client version reads.
- Arkiv seeding produced 24 creation logs and read back 24 entities.
- Seed transaction:
  `0x8740e6832ccead3a24d2cc766c3a002b41d072fda07627a8c48c1b0b9ea724fc`
  on the local dev chain. It is not a public explorer transaction.
- Moving-head benchmark: 20 sequential requests across two benign cases completed.
  A previous fixed-block run stopped after four successes and one `-32006` error.
  Across these 24 successful queries, observed client latency ranged 5.36–10.32 ms.
  These are small local measurements, not a throughput or attack-resistance claim.
- Docker stats, node `/data` size and shared-filesystem free space are sampled.
- EF faucet returned `The faucet is empty`; no successful AMPERE submission yet.

## Automated verification

Core tests exercise real loopback HTTP for success, errors, malformed JSON,
mismatched IDs, response-size limits, and timeouts. Integrity tests alter signed
contents, digest, signature and key. Additional checks cover baseline separation,
disk forecasting, redaction, and local origin enforcement.

Browser tests exercise source switching, filters, request selection, export,
verification of original and altered reports, and a 390px mobile viewport.
Screenshots are generated under ignored `artifacts/`.

The requirements pass added per-method request/failure counters and successful
call p50/p95 to Nodes. Ten core tests and two browser tests pass, including node
capacity forecast boundaries, a full-filesystem edge case, method counters, and
the explicitly synthetic 3.5-day disk alert in Example mode. A selected synthetic
console screenshot is intentionally committed under `docs/assets/` for the README.

## Not yet verified

Funded Ethereum frame submission, actual admission rules for that transaction,
per-frame validation gas profiling, local ethrex stress experiments, operator
adoption, long-running capacity forecast accuracy, or fresh-volume historical
retention behavior. No slow-query exploit or node CPU amplification is claimed.
