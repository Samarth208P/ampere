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

Implementation: `src/lib/rpc.ts`, `analysis.ts`, `report.ts`, `container.ts`, and
`scripts/benchmark-arkiv.ts`. An illustrative latency increase is available only
under Example mode; it is not a live performance finding.
