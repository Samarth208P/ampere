# Track requirements audit

Audited 2026-11-06 against the user-provided brief and
[official Mumbai prize page](https://ethglobal.com/events/mumbai/prizes).
This is an evidence checklist, not a claim of organizer approval.

## Arkiv / Node tooling

Primary direction: **operator dashboard**. A bounded private-query benchmark is
supporting functionality; no discovered slow-query exploit is claimed.

| Requirement                             | Implementation / evidence                                                                                                            | State                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Runs next to an Arkiv node              | [Pinned Compose node](../compose.yaml); [collector](../src/lib/collector.ts); live local measurements in [validation](VALIDATION.md) | Exercised                                                                            |
| Days to disk full, with alert           | [Node growth forecast](../src/lib/analysis.ts), [container measurements](../src/lib/container.ts), Nodes capacity alert below 7 days | Implemented; formula + alert tested; long-run accuracy unverified                    |
| Requests and latency per method         | Nodes → RPC method counters: count, failures, p50, p95                                                                               | Implemented and browser-tested; scope is AMPERE-observed calls, not all node traffic |
| Peers and sync                          | `net_peerCount`, `eth_syncing` via local node                                                                                        | Exercised; 0 peers is normal for the standalone dev node                             |
| CPU and memory                          | Docker container stats shown separately from host stats                                                                              | Exercised                                                                            |
| Load data on own node                   | [Seed script](../scripts/seed-arkiv.ts), 24 logs plus read-back                                                                      | Exercised                                                                            |
| Benchmark only owned nodes              | [Loopback IP gate](../src/lib/rpc.ts), redirect rejection, bounded sequential run                                                    | Exercised and unit-tested                                                            |
| Private slow-query disclosure           | Ignored `.ampere/` contains inputs and random-ID mappings; no params in [observations](../src/lib/types.ts)                          | Implemented; follow booth process if a slow shape is found                           |
| New repository built from scratch       | Initial commit `6b8a249`, independent TypeScript application; upstream clients are dependencies/references                           | Repository history supports this; team must satisfy event participation/timing rules |
| Works in the demo against Arkiv         | Real node flow tested; [demo sequence](DEMO.md)                                                                                      | Live flow ready; final demo delivery pending                                         |
| README identifies node and reproduction | [README protocol paths](../README.md#protocol-paths), image digest in Compose                                                        | Present                                                                              |
| Writer addresses and schema             | Writer in README; [schema](../arkiv/schema.md) includes types, ownership, expiry                                                     | Present                                                                              |
| Four judging files                      | Links below                                                                                                                          | Present, with concrete evidence and limitations                                      |
| Public repository                       | No Git remote was configured at this audit                                                                                           | **Pending publication**                                                              |
| Open-source license                     | [MIT](../LICENSE)                                                                                                                    | Present                                                                              |
| AI disclosure                           | [README provenance](../README.md#license--provenance)                                                                                | Present                                                                              |
| One Arkiv track prize per team          | Node tooling selected as target; no Swarm bonus claim                                                                                | Documented                                                                           |

### Equal-weight judging criteria

- **Feedback (25%)** — [friction.md](../arkiv/friction.md): SDK write-interface
  mismatch and historical retention behavior, with expected/actual results and
  reproduction instructions. No slow-query shape is disclosed.
- **Real use (25%)** — [real-use.md](../arkiv/real-use.md): what an operator can
  decide from counters, capacity warnings and inspectable failure records.
- **What's new (25%)** — [whats-new.md](../arkiv/whats-new.md): private workload
  identity, failure boundaries, cross-client evidence format, independent integrity
  checks. No claim to invent Docker monitoring or latency percentiles.
- **Easy to run (25%)** — [easy-to-run.md](../arkiv/easy-to-run.md): prerequisites,
  commands, runtime configuration and recovery. Cold download time depends on the
  user's network; a universal setup-time guarantee would be unsupported.

## EF / Frame Transaction Alternative Mempool

Direction: **developer tooling / admission evidence**.

| Requirement / criterion                  | Evidence                                                                                                      | State                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Code submits a real frame transaction    | [send-frame.ts](../scripts/send-frame.ts): chain guard, SDK signing, `eth_sendFrameTransaction`, receipt read | Implemented; live submission awaits funds                                   |
| Admitted transaction / explorer evidence | Intended gateway + explorer in README; no submitted AMPERE hash yet                                           | Pending funding; code route to eligibility exists, no claim of live success |
| Relation to alt mempool                  | Sidecar submission and `skandha_explorer_getTransaction` rule/lifecycle capture                               | Implemented; live inspection of our own tx pending                          |
| Usefulness                               | Preserve a node's reported rule verdict alongside RPC outcome, timing and signed evidence                     | Implemented; no operator study yet                                          |
| Creativity                               | Shared record across database-node diagnostics and frame-admission tooling                                    | Design argument, not a measured score                                       |
| Practicality / works                     | Bounded RPC, explicit errors, local persistence, replayable commands, tests                                   | General flows tested; funded EF path unverified                             |
| Team explains design/code/trade-offs     | [Walkthrough below](#team-walkthrough) and [source map](../README.md#source-map)                              | Prepared; actual team explanation required                                  |

A zero-value VERIFY/SENDER self-transfer validates the normal submission path.
It does not prove an alt-only transaction shape, >100k verification, staking-based
storage relaxation, reputation handling, or a novel DoS finding. Deeper per-frame
profiling is future work, not required functionality silently treated as done.

## Team walkthrough

1. `measuredRpc` bounds duration/response size, rejects redirects, and records
   outcomes without parameters. RPC rejection and timeout mean different things.
2. Arkiv seeding verifies entity events and read-back. A successful receipt alone
   did not prove creation against the mismatched SDK write address.
3. Workload IDs separate private query baselines. Method counters aggregate observed
   traffic, while workload comparisons stay isolated.
4. Disk days = shared free bytes / observed node-data growth rate. Compaction,
   other writers, restarts and short windows limit extrapolation.
5. The frame builder signs against a specific experimental profile. Admission
   rules and devnet versions evolve; the recorded node verdict is the evidence.
6. Reports sign canonical JSON bytes. Embedded keys prove integrity, not identity
   or measurement truth. No trusted timestamp or chain anchoring is implemented.

## Submission gates still open

- Publish this repository publicly and verify the README/assets/license from a
  logged-out browser. No destination remote is configured yet.
- Fund and run the EF transaction when available, then capture its actual
  admission and explorer evidence. Do not replace that with Example mode.
- Deliver the live Arkiv demonstration; capture a final video if required by
  the event submission form. Keep discovered query shapes off screen.
- Team confirms from-scratch timing/participation eligibility and can explain
  the code above. Only the organizers determine eligibility and awards.
