# Real use

Audience: Arkiv node operators and engineers investigating resource usage and
failed requests. The working demo uses a real owned node, not a public endpoint.

AMPERE records method latency, distinguishes node RPC errors from network failures,
shows peers and sync state, samples the node container, and exports signed evidence.
The node data growth forecast warns when observed growth would exhaust shared
filesystem capacity in fewer than seven days. It requires a one-minute window;
it is an estimate, not a capacity guarantee.

Verified: 24 seeded entities with read-back; 20 sequential benchmark requests
completed; a fixed-block run stopped on a real node error. See
[the validation record](../docs/VALIDATION.md) and reproduce with the
[README commands](../README.md#protocol-paths).

| Operator question                                         | Evidence / action                                                                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is storage likely to run out soon?                        | Nodes shows data size, shared free bytes and a growth-based forecast. Below seven days, investigate capacity and other writers. [Forecast and alert](../src/lib/analysis.ts)                          |
| Which monitored RPC methods fail or slow down?            | Nodes → RPC method counters shows request counts, failures, p50 and p95; inspect the corresponding recorder rows. Counts cover AMPERE calls only. [Implementation](../src/components/diagnostics.tsx) |
| Is this network failure or a node RPC error?              | Inspect `timeout`, `transport-error`, or `rpc-error` and numeric code. An RPC error is not automatically a protocol violation. [RPC client](../src/lib/rpc.ts)                                        |
| Is the node consuming resources while requests slow down? | Inspect Docker CPU/memory alongside the recording. Correlation is a lead to investigate; it is not per-query attribution. [Container sampler](../src/lib/container.ts)                                |
| Can an engineer audit the incident afterward?             | Export a signed recording, keep the private workload mapping separately, and verify it with the [CLI](../scripts/verify.ts).                                                                          |

For a reproducible alert demonstration, select **Example → Nodes**: the labeled
synthetic case has a 3.5-day forecast. The browser test checks that the warning is
visible. This is an alert-path test, not evidence of a real full-disk incident.

Practical limits: no external operator user study yet, no proof of a discovered
DoS vector, and no attribution of CPU to a specific query. Container telemetry
is aggregate. Peer count zero is expected for this single-node development setup.
