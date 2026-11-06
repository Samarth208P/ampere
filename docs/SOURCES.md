# Upstream sources and attribution

Checked 2026-11-06. Upstream is evolving; the deployed image and current repository
may not have identical revisions. No claim of current-EIP conformance is made.

- Prize requirements: https://ethglobal.com/events/mumbai/prizes
- EF workshop: https://github.com/forshtat/mempool-workshop at
  `bcfe02a196ca97b6fb0d1044db9d0b4c673831fc`. The self-relay transaction pattern
  follows the MIT-licensed workshop; encoding/signing uses
  `@forshtat/hegota-support@0.0.1` rather than copied cryptographic code.
- Sidecar RPC and explorer contracts:
  https://github.com/forshtat/mempool-workshop-sidecar, notably
  `deploy/devnet/devnet-readme.md` and `docs/sidecar_explorer.md`.
- Arkiv node: https://github.com/Arkiv-Network/arkiv at
  `2a3526dd861bf01c284d232d8ea4f880e24fd526`. Compose follows its
  `docker/compose.yml`; the typed write interface follows
  `crates/arkiv-bindings/src/lib.rs`, `encode.rs`, and
  `crates/arkiv-interfaces/src/constants.rs` / `entity.rs`.
- Arkiv documentation: https://docs.arkiv.network/

Reference checkouts are ignored under `.reference/` and are not required at
runtime. Arkiv integration uses direct JSON-RPC plus viem ABI encoding. The known
development key is from the node's own demonstration setup, not a user secret.
