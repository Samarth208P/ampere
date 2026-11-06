import { mkdir, writeFile } from "node:fs/promises";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEventLogs,
} from "viem";
import { setTimeout } from "node:timers/promises";
import { privateKeyToAccount } from "viem/accounts";
import { assertLocalEndpoint, measuredRpc } from "../src/lib/rpc";
import { registry, registryAbi, seedOperation } from "../src/lib/arkiv-abi";
import { withWriter } from "../src/lib/writer";

await withWriter(async () => {
  const url = assertLocalEndpoint(
    process.env.ARKIV_RPC_URL || "http://127.0.0.1:8545",
  );
  const transport = http(url, {
    retryCount: 0,
    timeout: 10000,
    fetchOptions: { redirect: "error" },
  });
  const probe = createPublicClient({ transport });
  const id = await probe.getChainId();
  if (id !== 1337)
    throw new Error(`Expected local arkiv-reth --dev chain 1337, got ${id}`);
  // Chain 1337 is also used by other devnets; require the Arkiv RPC before writing.
  await measuredRpc(url, "arkiv", "arkiv_getEntityCount");
  // Published reth/Hardhat development key. Never a user secret, never usable for real funds.
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );
  const chain = defineChain({
    id,
    name: "AMPERE local Arkiv",
    nativeCurrency: { name: "Dev Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [url] } },
  });
  const wallet = createWalletClient({ account, chain, transport });
  const dataset = `ampere-${Date.now()}`;
  const txHash = await wallet.writeContract({
    address: registry,
    abi: registryAbi,
    functionName: "execute",
    args: [
      Array.from({ length: 24 }, (_, index) => seedOperation(dataset, index)),
    ],
  });
  const receipt = await probe.waitForTransactionReceipt({
    hash: txHash,
    timeout: 30_000,
  });
  if (receipt.status !== "success")
    throw new Error("Seed transaction reverted");
  const createdEntities = parseEventLogs({
    abi: registryAbi,
    logs: receipt.logs,
    eventName: "EntityCreated",
  }).map((event) => event.args.entityKey);
  if (createdEntities.length !== 24)
    throw new Error(
      `Expected 24 EntityCreated logs; got ${createdEntities.length}. Node/ABI mismatch.`,
    );
  // The store can trail canonical block publication. Wait for the bounded read-back.
  let verified = false;
  for (let i = 0; i < 10; i++) {
    await setTimeout(1000);
    const response = await measuredRpc<{ data: unknown[] }>(
      url,
      "arkiv",
      "arkiv_query",
      [`dataset = str('${dataset}')`, { limit: 24 }],
    );
    if (
      response.value &&
      Array.isArray(response.value.data) &&
      response.value.data.length === 24
    ) {
      verified = true;
      break;
    }
  }
  if (!verified)
    throw new Error(
      "24 writes were mined but read-back did not confirm the dataset.",
    );
  const result = { txHash, createdEntities };
  await mkdir(".ampere", { recursive: true });
  await writeFile(
    ".ampere/seed.json",
    JSON.stringify({ dataset, wallet: account.address, ...result }, null, 2),
  );
  // Ordinary equality lookups, not deliberately pathological query shapes.
  await writeFile(
    ".ampere/benchmark-cases.json",
    JSON.stringify(
      [
        { query: `dataset = str('${dataset}')`, limit: 10 },
        {
          query: `dataset = str('${dataset}') AND category = str('receipt')`,
          limit: 10,
        },
      ],
      null,
      2,
    ),
  );
  console.log(
    `Created ${result.createdEntities.length} entities on the owned local node.\nWriter: ${account.address}\nTransaction: ${result.txHash}\nPrivate benchmark inputs: .ampere/benchmark-cases.json`,
  );
});
