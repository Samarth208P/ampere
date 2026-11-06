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
`docs/VALIDATION.md` and reproduce with the README commands.

Practical limits: no external operator user study yet, no proof of a discovered
DoS vector, and no attribution of CPU to a specific query. Container telemetry
is aggregate. Peer count zero is expected for this single-node development setup.
