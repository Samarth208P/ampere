import { getProfile } from "@forshtat/hegota-support/profiles";
import {
  frame,
  newTx,
  secp256k1Placeholder,
  signTx,
  txHash,
} from "@forshtat/hegota-support/tx";
import { toWire } from "@forshtat/hegota-support/rpc";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import type { Recording } from "./types";

/** One zero-value self transfer on the experimental workshop network. */
export async function buildFrameTransfer(key: Hex, nonce: bigint) {
  const profile = getProfile("ethrex-eip8141-tracer");
  const sender = privateKeyToAccount(key).address;
  const tx = await signTx(
    profile,
    newTx({
      chainId: 1337,
      sender,
      nonceSeq: nonce,
      frames: [
        frame(profile, "VERIFY", {
          scope: "EXECUTION_AND_PAYMENT",
          target: null,
          execution: 30_000n,
        }),
        frame(profile, "SENDER", {
          target: sender,
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
  return { hash: txHash(profile, tx), wire: toWire(tx) };
}

export function receiptStatus(value: unknown): "included" | "reverted" | null {
  if (value === null) return null;
  if (!value || typeof value !== "object")
    throw new Error("Invalid transaction receipt.");
  const receipt = value as { status?: unknown; frameReceipts?: unknown };
  if (
    !["0x0", "0x1"].includes(receipt.status as string) ||
    (receipt.frameReceipts !== undefined &&
      (!Array.isArray(receipt.frameReceipts) ||
        !receipt.frameReceipts.every(
          (f) => f && ["0x0", "0x1"].includes(f.status),
        )))
  ) {
    throw new Error("Invalid transaction receipt status.");
  }
  return receipt.status === "0x1" &&
    ((receipt.frameReceipts ?? []) as { status: string }[]).every(
      (f) => f.status === "0x1",
    )
    ? "included"
    : "reverted";
}

export function transactionRecord(
  hash: string,
  status: NonNullable<Recording["transaction"]>["status"],
): NonNullable<Recording["transaction"]> {
  return { hash, status, explorer: "https://explorer.altmempool.wtf/" };
}
