# Demo sequence

Use the current README quick start. Keep `.ampere/` and any private query input
files closed during screen sharing. The public demo must never display a
discovered slow-query shape, even if it is only visible in a terminal.

## Before the demo

1. `docker compose up -d`, `npm run doctor` and `npm run collect`.
2. With no watch writer running: `npm run arkiv:seed`, then `npm run arkiv:benchmark`.
3. `npm run collect:watch` in one terminal; `npm run dev` in another.
4. Open `http://127.0.0.1:3000`, **Live**. Leave the collector running for at least
   60 seconds to accumulate capacity-growth history.

## Show the operator workflow

| Moment                  | Show                                                        | Explain                                                        |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Node identity           | Nodes: Arkiv client, block, peers, sync                     | This is our owned local Arkiv node; 0 peers is expected        |
| Next-to-node visibility | Container CPU/memory, `/data` size, free space and forecast | External node directories cannot see these local resources     |
| Per-method accounting   | Nodes: RPC method counters                                  | Counts and percentiles cover AMPERE-observed probes/benchmarks |
| Request evidence        | Recorder: select a row, inspect outcome/timing/bytes        | Wall-clock latency is not isolated node CPU time               |
| Controlled workload     | Completed benchmark summary and private workload IDs        | Inputs remain private; the run is sequential and bounded       |
| Portable report         | Export, open Reports, verify downloaded JSON                | Digest and signature verify unchanged contents                 |

If disk growth is too small for a forecast, explain the unknown state. To show
the alert behavior, explicitly switch to **Example** and announce that it is
synthetic: Nodes shows a 3.5-day example warning. Return to **Live** afterward.
Never present this example as a measured capacity incident.

## Ethereum when funded

Stop the collector before another writer runs. Execute `npm run ethereum:send`
then `npm run ethereum:inspect`; resume `npm run collect:watch`. Show the returned
hash, actual receipt state and captured rule verdicts. Search that hash at
https://explorer.altmempool.wtf/.

If funding is still unavailable, show the submission code and state that live
submission has not been verified. The track allows submission code as evidence;
that is not the same as a working, demonstrated admission flow.

The automated CLI integration test signs real SDK envelopes against a local RPC
mock and exercises inclusion, rejection, disconnects and receipt recovery. It is
software validation, never evidence of real devnet admission.

## Finish

Open the four Arkiv judging files and the requirements audit. Describe the SDK
compatibility finding and the historical-read failure without disclosing any
slow query. Do not claim new DoS vulnerabilities or per-request CPU attribution.
