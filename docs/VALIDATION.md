# Validation — 2026-11-06

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

The completed hardening and Netlify pass has **18 automated tests and six browser/API tests**
passing, plus `npm run typecheck` and `npm run build`. Browser checks ran against
the production server with installed Chrome. `npm audit --omit=dev` reported
zero known vulnerabilities at the time of this audit.

Additional regression coverage:

- Active source clicks retain data; paused polling stops, manual refresh works.
- Invalid live data produces a recoverable error; it never falls back to fixtures.
- A recent request cannot mask stale per-node status.
- Writer exclusion and cleanup on callback, read and save failures; corrupt
  source files are preserved. Saved observations are sorted and capped at 1,000.
- Concurrent first exports share one fully written signing key.
- Foreign origins, invalid JSON and uploads exceeding 2 MB are rejected.
- Ethereum CLI against an isolated HTTP mock: SDK envelope signing, inclusion,
  wrong chain, absent funding, RPC rejection, transport disconnect, duplicate-send
  prevention, receipt recovery and expired sidecar history. No devnet funding used.
- Owned-node benchmark error guards stop after one failing request, retain a
  sanitized observation, and keep query text out of logs and recording JSON.
- Signed cloud snapshot publishing against the official Netlify Blobs local
  server, including authenticated ingestion, pinned signer, replay rejection,
  hosted read/export handlers and local durability during upload failure.

The synthetic 3.5-day capacity alert remains explicitly labeled Example data.
The committed README screenshot is also synthetic. CI is configured but has not
run remotely because publication is deferred.

## Netlify packaging

Native Windows offline packaging hit filesystem restrictions. A clean Linux
container completed `netlify build --offline`, including the Next.js Runtime
5.16.6 adapter and serverless-function packaging. The privacy gate passed seven
trace manifests (1,119 traced paths in that Linux build), with no local keys,
recordings, private queries or env files. An intentionally present private-path
marker was excluded. Actual hosted deployment and upload remain unverified.

The audit caught Next.js tracing local `.ampere` files into server bundles.
`outputFileTracingExcludes` and the mandatory build privacy gate now prevent
that. No bundle was uploaded. Cleanup of the older generated Windows artifacts
was blocked by automatic approval review; deploy only a fresh, checked build.

## Current live rerun

Docker Desktop initially failed during startup around its local inference socket;
a restart recovered the engine. The existing Arkiv data volume was retained.
`npm run doctor` then confirmed Docker 29.5.3, the running owned container, local
Arkiv RPC and the workshop Ethereum chain 1337 endpoint. A legacy lock left by
the earlier stopped collector was cleared only after checking for active writers.

- Fresh seed verified 24 creation events and matched all 24 read-back keys.
  Local transaction:
  `0x9545968854639ba89f2e48a271c66307022cae5bf9708e6502d14a545a10796c`.
- Two ordinary private workloads completed 20 sequential samples in the rerun.
- Seven live collector samples spanned about 99 seconds. Both RPCs responded.
  Node disk usage grew from 22,851,584 to 23,085,056 bytes; shared filesystem free
  space at the final sample was 987,547,111,424 bytes.
- The node forecast changed from unknown during warm-up to roughly 4,832 days
  in that quiet local run. This verifies the calculation path, not a useful
  production capacity forecast or sustained-growth accuracy claim.
- Node CPU, memory, PIDs and block I/O were sampled from Docker independently
  of host CPU/memory. Raw query shapes stayed in ignored private files.

## Not yet verified

Funded Ethereum frame submission, actual admission rules for that transaction,
per-frame validation gas profiling, local ethrex stress experiments, operator
adoption, long-running capacity forecast accuracy, or fresh-volume historical
retention behavior. No slow-query exploit or node CPU amplification is claimed.
