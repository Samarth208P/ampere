import { readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { withRecordingWriter } from "../src/lib/writer";
import { RpcFailure } from "../src/lib/rpc";
import { recordedCall } from "../src/lib/recorded-call";
import {
  buildFrameTransfer,
  receiptStatus,
  transactionRecord,
} from "../src/lib/frame-transaction";
import { ethereumUrl } from "../src/lib/collector";
import { saveRecording } from "../src/lib/store";

await withRecordingWriter(async (recording) => {
  const call = recordedCall(recording, ethereumUrl(), "ethereum", 15000);
  if (
    recording.transaction &&
    ["submitted", "unknown"].includes(recording.transaction.status)
  ) {
    throw new Error(
      `Previous transaction ${recording.transaction.hash} is unresolved. Run npm run ethereum:inspect before sending again.`,
    );
  }
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
    if (!process.argv.includes("--faucet"))
      throw new Error(
        `Fund ${account.address} with at least 0.001 workshop devnet ETH (chain 1337), then rerun. No transaction sent. Use npm run ethereum:send:faucet only to request faucet funding.`,
      );
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
  const { hash, wire } = await buildFrameTransfer(
    key,
    BigInt(
      await call<string>("eth_getTransactionCount", [
        account.address,
        "pending",
      ]),
    ),
  );
  // Retain the local hash before submission, including ambiguous transport failures.
  recording.transaction = transactionRecord(hash, "unknown");
  delete recording.admission;
  await saveRecording(recording);
  try {
    const returnedHash = await call<string>("eth_sendFrameTransaction", [wire]);
    if (
      typeof returnedHash !== "string" ||
      returnedHash.toLowerCase() !== hash.toLowerCase()
    )
      throw new Error(
        "Submission hash mismatch; inspect the locally computed hash before retrying.",
      );
    recording.transaction.status = "submitted";
  } catch (error) {
    if (
      error instanceof RpcFailure &&
      error.observation.outcome === "rpc-error"
    )
      recording.transaction.status = "rejected";
    console.log(`Inspectable transaction hash: ${hash}`);
    throw error;
  }
  await saveRecording(recording);
  console.log(`Submitted ${hash}. Waiting for receipt.`);
  for (let i = 0; i < 20; i++) {
    await setTimeout(2000);
    const status = receiptStatus(
      await call("eth_getTransactionReceipt", [hash]),
    );
    if (status) {
      recording.transaction.status = status;
      break;
    }
  }
  console.log(
    `${recording.transaction.status}: ${hash}\nExplorer: ${recording.transaction.explorer} (search the hash)`,
  );
  if (recording.transaction.status === "reverted")
    throw new Error(
      "Transaction or one of its frames reverted. Inspect its admission evidence.",
    );
  if (recording.transaction.status === "submitted")
    console.log(
      "Receipt still pending. Run npm run ethereum:inspect later; do not resubmit.",
    );
});
