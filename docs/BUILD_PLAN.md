# AMPERE build plan

Flight recorder for blockchain infrastructure. Measure request latency, capture
admission evidence, compare like-for-like samples, and export verifiable reports.

## Targets, checked 2026-11-06

Source: https://ethglobal.com/events/mumbai/prizes

- Ethereum Foundation: Best use of the Frame Transaction Alternative Mempool.
  Build an admission recorder/profiler; prove real use with a submitted frame tx.
- Arkiv: Node tooling. Run beside an owned node, record method latency and node
  resources, and make incidents reproducible. Complete the four judging files.
- Lower submission volume is a hypothesis, not an observed statistic.
- Hedera, Swarm and advanced fuzzing are deferred until both core demos work.

## Milestones

1. Shared measurement, bounded RPC client, report integrity and tests.
2. Live Arkiv health collector and Ethereum frame transaction submission.
3. Operator console: recorded requests, latency comparison, report export.
4. Node resource telemetry, disk forecast and private query benchmarking.
5. Submission recovery, production validation and demo runbook.

Core implementation is complete and exercised locally. The funded Ethereum
demonstration and public publication remain owner-deferred. Local ethrex policy
experiments and deeper per-frame cost profiling are future extensions; mock CLI
tests do not count as real admission experiments.

Never represent fixtures as live measurements, request latency as node CPU cost,
or an RPC timeout as a protocol rejection. Raw queries stay private. No slow-query
tests on public nodes. A signed report proves integrity and possession of a key,
not the truth of its measurements or a trusted operator identity.

## Visual plan

An instrument console, revised to the requested terminal aesthetic: graphite
workspace (#101619), raised dark surfaces (#172024), pale text (#dde6df), sage
selection (#adcbb4), amber attention (#e8bc83), and teal traces (#83b8a8).
Consolas / system monospace for interface, hashes and measurements. Left-aligned content, generous title area,
one prominent request timeline with an adjacent evidence inspector. Borders group
observations; no decorative metric-card grid. Mobile stacks the inspector below
the request list. The recorder, not a marketing hero, is the visual focus.

## Source constraints

The workshop uses experimental protocol revisions. Pin SDK versions and record
client/chain metadata; do not claim current-EIP conformance from a devnet result.
The Arkiv repository includes a single-node Docker configuration; use it as the
reference rather than assuming vanilla geth provides Arkiv methods.
