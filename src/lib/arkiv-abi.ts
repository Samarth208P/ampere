import { encodeAbiParameters, parseAbi, parseAbiParameters, stringToHex, type Hex } from "viem";
import { randomBytes } from "node:crypto";

// Pinned arkiv-reth ABI: Arkiv-Network/arkiv, crates/arkiv-bindings/src/lib.rs.
export const registry = "0x4400000000000000000000000000000000000044" as const;
export const registryAbi = parseAbi([
  "struct Operation { uint8 operation; bytes operationData; }",
  "function execute(Operation[] ops) returns (bytes32[] keys)",
  "event EntityCreated(bytes32 indexed entityKey, address indexed owner, uint64 expiresAt, uint8 creationFlags)",
]);
const createParameters = parseAbiParameters("(uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, (bytes32 name, uint8 typeId, bytes value)[] attributes)");

export function seedOperation(dataset: string, index: number): { operation: number; operationData: Hex } {
  const strings = { category: index % 2 === 0 ? "receipt" : "block", contentType: "application/json", dataset,
    payload: JSON.stringify({ index, message: "AMPERE diagnostic sample" }) };
  const attributes = Object.entries(strings).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => ({
    name: stringToHex(name, { size: 32 }),
    // str = 8; bytes = 7; bit 7 marks indexed attributes. Values are raw UTF-8.
    typeId: name === "payload" ? 7 : ["category", "dataset"].includes(name) ? 136 : 8,
    value: stringToHex(value),
  }));
  return { operation: 1, operationData: encodeAbiParameters(createParameters, [{
    salt: BigInt(`0x${randomBytes(16).toString("hex")}`), expiresAt: 0n, minLifetime: 43200n, creationFlags: 0, attributes,
  }]) };
}
