# Easy to run

Use the [README quick start](../README.md#boot): `npm ci`, `docker compose up -d`, `npm run collect`,
then `npm run dev`. Seed and benchmark commands are separate and bounded.

Run `npm run doctor` after starting Docker for bounded, read-only checks of the
engine, owned RPC, saved data and lock. `npm run check` runs the type check,
regression tests and production build. `npm start` serves that build locally.
Writer locks include PID/start time; failures release the lock even when reading
or saving a recording fails. A hard process kill still needs a manual lock check.

Requirements: Node 22.16+, npm, Docker with a Linux engine. The node image is
pinned by digest. Tested from Windows PowerShell with Docker Desktop. Linux/macOS
host behavior has not yet been exercised. Browser tests use installed Chrome.

No funded public Arkiv wallet is needed: the local node has a known development
account. The seed checks chain ID and loopback targeting before using that key.
The independent Ethereum demo needs workshop devnet funds.

`docker compose stop` stops the node and retains data. The README covers unavailable
nodes, stale recordings, writer locks, faucet funding, and historical-read errors.
Ordinary query examples are generated privately by `arkiv:seed`.

See [the operator runbook](../docs/RUNBOOK.md) for configuration and recovery,
[the demo sequence](../docs/DEMO.md) for expected screens, and
[the pinned Compose definition](../compose.yaml) for the exact node image.
No account, hosted database or API key is required for the local Arkiv flow.
First-run duration depends on image/package download speed; installation has
not yet been timed on a second user's clean machine.
