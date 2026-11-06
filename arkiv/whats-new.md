# What's new

AMPERE connects request evidence, resource context, baseline comparison and a
verifiable report in one workflow. The contribution is the diagnostic record and
its privacy boundary, rather than a collection of stock monitoring panels.

- Different query workloads never share a baseline, even though they use the same
  `arkiv_query` method. Opaque IDs keep private shapes out of the recording.
- A local bounded benchmark preserves failures and stops rather than increasing
  load when an error or long latency appears.
- The same report format works for Ethereum frame-admission evidence and Arkiv
  node diagnostics. Reports include source labels and measurement limitations.
- Ed25519 verification detects modification after export. It makes no claim of
  independently trusted measurement or blockchain timestamping.

Implementation: [RPC measurements](../src/lib/rpc.ts),
[baseline separation](../src/lib/analysis.ts), [report integrity](../src/lib/report.ts),
[container context](../src/lib/container.ts), and
[bounded benchmark](../scripts/benchmark-arkiv.ts). An illustrative latency increase is available only
under Example mode; it is not a live performance finding.

Built-in RPC methods provide individual answers, and Docker provides resource
counters. AMPERE adds a retained request-level record, consistent error semantics,
comparison windows, private workload identity, and a report that can be verified
after leaving the UI. We do not claim to invent the underlying counters or
percentiles. The [demo](../docs/DEMO.md) exercises that complete workflow.
