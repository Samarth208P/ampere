import { mkdir, readFile, writeFile, open, unlink } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { getProfile } from "@forshtat/hegota-support/profiles";
import {
  frame,
  newTx,
  secp256k1Placeholder,
  signTx,
} from "@forshtat/hegota-support/tx";
import { toWire } from "@forshtat/hegota-support/rpc";
import { measuredRpc, RpcFailure } from "../src/lib/rpc";
import { ethereumUrl } from "../src/lib/collector";
import { readRecording, saveRecording } from "../src/lib/store";

// One harmless, zero-value self transfer. Adapted from the MIT-licensed workshop.
await mkdir(".ampere", { recursive: true });
const lock = await open(".ampere/writer.lock", "wx").catch(() => {
  throw new Error("Stop the collector before submitting a transaction.");
});
const recording = await readRecording();
const call = async <T>(method: string, params: unknown[] = []): Promise<T> => {
  try {
    const result = await measuredRpc<T>(
      ethereumUrl(),
      "ethereum",
      method,
      params,
      15000,
    );
    recording.observations.push(result.observation);
    return result.value;
  } catch (error) {
    if (error instanceof RpcFailure)
      recording.observations.push(error.observation);
    throw error;
  }
};
try {
  const chainId = Number(await call<string>("eth_chainId"));
  if (chainId !== 1337)
    throw new Error(
      `Expected workshop devnet chain 1337, got ${chainId}. Nothing sent.`,
    );
  let key: Hex;
  try {
    key = (await readFile(".ampere/devnet-key", "utf8")).trim() as Hex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    key = generatePrivateKey();
    await writeFile(".ampere/devnet-key", key, { flag: "wx", mode: 0o600 });
  }
  const account = privateKeyToAccount(key);
  console.log(`Devnet-only sender: ${account.address}`);
  if (
    BigInt(await call<string>("eth_getBalance", [account.address, "latest"])) <
    1_000_000_000_000_000n
  ) {
    await call("skandha_explorer_faucet", [account.address]);
    let funded = false;
    for (let i = 0; i < 15; i++) {
      await setTimeout(2000);
      if (
        BigInt(
          await call<string>("eth_getBalance", [account.address, "latest"]),
        ) >= 1_000_000_000_000_000n
      ) {
        funded = true;
        break;
      }
    }
    if (!funded)
      throw new Error("Faucet funding not observed within 30 seconds.");
  }
  const profile = getProfile("ethrex-eip8141-tracer");
  const tx = await signTx(
    profile,
    newTx({
      chainId,
      sender: account.address,
      nonceSeq: BigInt(
        await call<string>("eth_getTransactionCount", [
          account.address,
          "pending",
        ]),
      ),
      frames: [
        frame(profile, "VERIFY", {
          scope: "EXECUTION_AND_PAYMENT",
          target: null,
          execution: 30_000n,
        }),
        frame(profile, "SENDER", {
          target: account.address,
          execution: 50_000n,
          state: 200_000n,
          value: 0n,
        }),
      ],
      signatures: [secp256k1Placeholder(profile, "0x")],
      fees: { maxFeePerGas: 2_000_000_000n },
    }),
    key,
  );
  const hash = await call<string>("eth_sendFrameTransaction", [toWire(tx)]);
  if (!/^0x[0-9a-f]{64}$/i.test(hash))
    throw new Error("Unexpected submission response");
  recording.transaction = {
    hash,
    status: "submitted",
    explorer: "https://explorer.altmempool.wtf/",
  };
  await saveRecording(recording);
  console.log(`Submitted ${hash}. Waiting for receipt.`);
  for (let i = 0; i < 20; i++) {
    await setTimeout(2000);
    const receipt = await call<{
      status: string;
      frameReceipts?: { status: string }[];
    } | null>("eth_getTransactionReceipt", [hash]);
    if (receipt) {
      recording.transaction.status =
        receipt.status === "0x1" &&
        (receipt.frameReceipts ?? []).every((f) => f.status === "0x1")
          ? "included"
          : "reverted";
      break;
    }
  }
  console.log(
    `${recording.transaction.status}: ${hash}\nExplorer: ${recording.transaction.explorer} (search the hash)`,
  );
} finally {
  await saveRecording(recording);
  await lock.close();
  await unlink(".ampere/writer.lock");
}
