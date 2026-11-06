# Easy to run

Use the README quick start: `npm ci`, `docker compose up -d`, `npm run collect`,
then `npm run dev`. Seed and benchmark commands are separate and bounded.

Requirements: Node 22.16+, npm, Docker with a Linux engine. The node image is
pinned by digest. Tested from Windows PowerShell with Docker Desktop. Linux/macOS
host behavior has not yet been exercised. Browser tests use installed Chrome.

No funded public Arkiv wallet is needed: the local node has a known development
account. The seed checks chain ID and loopback targeting before using that key.
The independent Ethereum demo needs workshop devnet funds.

`docker compose stop` stops the node and retains data. The README covers unavailable
nodes, stale recordings, writer locks, faucet funding, and historical-read errors.
Ordinary query examples are generated privately by `arkiv:seed`.
