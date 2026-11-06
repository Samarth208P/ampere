# Local diagnostic dataset

Node: pinned arkiv-reth development node from `compose.yaml`, chain 1337.
Writer/owner: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (public dev account).

24 entities per seed, a unique dataset ID per run. Create operations use the
current node ABI at `0x4400000000000000000000000000000000000044`.

| Attribute   | Node type                   | Indexed | Meaning                                    |
| ----------- | --------------------------- | ------- | ------------------------------------------ |
| dataset     | str (136 with indexed flag) | Yes     | Seed run identifier                        |
| category    | str (136 with indexed flag) | Yes     | receipt or block                           |
| contentType | str (8)                     | No      | application/json                           |
| payload     | bytes (7)                   | No      | JSON with sample index and diagnostic text |

Attributes are sorted by name. Salt is 128 random bits. Creation flags are zero;
owner controls mutations. `expiresAt=0`, `minLifetime=43200` blocks, approximately
24 hours at the development chain's two-second cadence.

The seed records entity keys, writer, dataset ID and transaction hash locally in
`.ampere/seed.json`. Queries and run-to-workload mappings remain private. Public
incident reports store no entity payloads, queries or keys from benchmark results.
