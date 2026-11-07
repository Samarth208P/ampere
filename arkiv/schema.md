# Arkiv Diagnostic Entity Schema & Writer Specification

**Evaluation Specification**: Detailed specification of all entities written to the local Arkiv node during the AMPERE demonstration.  
**Pinned Node Identity**: `ghcr.io/arkiv-network/arkiv-reth@sha256:83d58d3d79c7d1a3e3b95cc94f2d9baa37cb2801d1cda6753727de46a8688a31`  
**Chain ID**: `1337` (`arkiv-reth --dev --dev.block-time 2s`)  
**Precompile Contract Address**: `0x4400000000000000000000000000000000000044`  
**Writer Wallet Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (pre-funded default development account)

---

## 1. Entity Attributes Schema

Each invocation of `npm run arkiv:seed` generates an atomic batch of 24 distinct diagnostic entities indexed under a unique runtime `dataset` identifier (`ampere-${timestamp}`).

| Attribute Name | Node Type Identifier | Type ID (Raw) | Indexed? | Description | Example Value |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`dataset`** | `str` | `136` (8 + 128) | **Yes** | Unique batch identifier linking entities to a single seed run | `"ampere-1772935200"` |
| **`category`** | `str` | `136` (8 + 128) | **Yes** | Diagnostic category discriminator (`receipt` or `block`) | `"receipt"` (even), `"block"` (odd) |
| **`contentType`** | `str` | `8` | No | Payload media type string | `"application/json"` |
| **`payload`** | `bytes` | `7` | No | Serialized UTF-8 JSON diagnostic sample | `{"index": 0, "message": "AMPERE diagnostic sample"}` |

### Attribute Encoding Details
- **Type IDs**: In Arkiv's native storage format, `str` has base type ID `8`, and `bytes` has base type ID `7`. Setting the 7th bit (`+128`) marks the attribute as an indexed column, creating a fast-path lookup in the GolemDB index tree (`136 = 8 | 0x80`).
- **Sorting Requirement**: Per Arkiv precompile ABI specifications, all attributes must be lexicographically sorted by 32-byte name before parameter encoding: `category` $\to$ `contentType` $\to$ `dataset` $\to$ `payload`.
- **Attribute Name Packing**: Right-padded with zeros to a 32-byte `bytes32` word (`stringToHex(name, { size: 32 })`).

---

## 2. Precompile Solidity Interface & ABI

Mutations are executed directly against the node's state precompile via standard EVM contract calls:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IArkivRegistry {
    struct Attribute {
        bytes32 name;
        uint8 typeId;
        bytes value;
    }

    struct CreateData {
        uint128 salt;
        uint64 expiresAt;
        uint64 minLifetime;
        uint8 creationFlags;
        Attribute[] attributes;
    }

    struct Operation {
        uint8 operation;       // 1 = Create, 2 = Update, 3 = Delete
        bytes operationData;   // ABI-encoded CreateData tuple
    }

    /// @notice Executes a batch of storage operations atomically
    function execute(Operation[] calldata ops) external returns (bytes32[] memory keys);

    /// @notice Emitted when an entity is successfully written to GolemDB
    event EntityCreated(
        bytes32 indexed entityKey,
        address indexed owner,
        uint64 expiresAt,
        uint8 creationFlags
    );
}
```

---

## 3. Entity Lifetime & Cryptographic Salt Parameters

- **Salt**: 128-bit cryptographically secure pseudorandom number (`randomBytes(16)`), preventing entity key collisions across re-seeding runs:
  $$\text{salt} = \text{uint128}(\text{randomBytes}(16))$$
- **`expiresAt`**: Set to `0` (indicating no explicit fixed block expiration).
- **`minLifetime`**: Set to `43,200` blocks ($\approx 24$ hours at the dev chain's 2-second block cadence), ensuring that the entities remain persistent in the state database during benchmarking sessions.
- **`creationFlags`**: Set to `0` (standard ownership permissions; entity mutations restricted to owner `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`).

---

## 4. Querying Seeded Entities

Once seeded, entities can be retrieved using Arkiv's native SQL-like query language through the `arkiv_query` RPC method:

### Query by Indexed Dataset & Category:
```bash
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "arkiv_query",
    "params": [
      "dataset = str(\"ampere-1772935200\") AND category = str(\"receipt\")",
      { "limit": 10 }
    ],
    "id": 1
  }'
```

### Dual-Assertion Verification:
AMPERE's seed script (`scripts/seed-arkiv.ts`) performs a mandatory **dual-assertion**:
1. It waits for the transaction receipt and confirms receipt status `0x1`.
2. It parses the EVM event logs and asserts that exactly **24 `EntityCreated` logs** were emitted.
3. It performs a bounded retry loop against `arkiv_query` until all 24 entity keys match the created keys, guaranteeing that state was committed to disk before allowing benchmarks to proceed.

The seed metadata (transaction hash, dataset ID, created entity keys) is persisted locally in `.ampere/seed.json` for reproducible testing.
