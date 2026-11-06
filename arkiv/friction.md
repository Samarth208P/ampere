# Arkiv feedback

Observed 2026-11-06 against the image digest pinned in `compose.yaml`.
No slow-query shapes or sensitive benchmark parameters are published here.
Node identity is in [Compose](../compose.yaml); upstream code references are in
[SOURCES.md](../docs/SOURCES.md). Reproduction uses the [README](../README.md#protocol-paths).

## SDK and node write surfaces differ

Expected: `@arkiv-network/sdk@0.7.0` `mutateEntities` creates 24 entities on the
provided node, or fails clearly if the interfaces are incompatible.

Observed: transaction
`0x10e9763d900a04330eb9ea0930769dc6e6f3726ad7ab5848f678f6ca7cc134c8`
had receipt status `0x1`, no logs, and zero created entities. The SDK sends
compressed RLP to `0x00000000000000000000000000000061726b6976`. This node's
source uses `execute(Operation[])` at
`0x4400000000000000000000000000000000000044`.

Reproduce: start the pinned local node, use SDK 0.7.0 with the public funded dev
account, and attempt an ordinary create. Check entity events and read-back, not
only the transaction receipt. Source references are in `docs/SOURCES.md`.

Improvement: publish a node/SDK compatibility matrix and detect unsupported node
write APIs before submission. Warn when a mutation has no expected entity events.
AMPERE uses the node ABI directly and verifies both events and reads. No SDK
dependency is kept merely to claim integration.

## Historical reads despite retention configuration

Expected: `ARKIV_STORE_HISTORY=128` retains a newly sampled block during a short
sequential benchmark. Startup confirmed `history=Blocks(128)`.

Observed: a fixed-block run had four successful reads, then `-32006`:
`block 364 is unavailable: state for this block is not retained`. A later check
reported tip 396, still within 128 blocks. This was after changing the same volume
from head-only retention; fresh-volume behavior has not been independently tested.

Reproduce: start with head-only, switch to 128 as in Compose, seed the dataset,
then run `npm run arkiv:benchmark:fixed`. Retain the error and block
metadata. Do not interpret it as a query performance vulnerability.

Improvement: expose effective queryable block range and clarify whether changing
retention settings on an existing database requires migration or reinitialization.
AMPERE stops on failure and offers an explicitly labeled moving-head benchmark.

## Operational improvements

The source's single-node Compose configuration made a real local setup practical.
An official compatibility-pinned minimal node plus a diagnostic health command
would reduce first-run time. Per-method execution counters and resource metrics
would help distinguish server cost from end-to-end RPC latency.
