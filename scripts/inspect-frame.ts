import { withRecordingWriter } from "../src/lib/writer";
import { ethereumUrl } from "../src/lib/collector";
import { recordedCall } from "../src/lib/recorded-call";
import { receiptStatus, transactionRecord } from "../src/lib/frame-transaction";
import { parseAdmission } from "../src/lib/admission";

await withRecordingWriter(async (recording) => {
  const hash = process.argv[2] || recording.transaction?.hash;
  if (!hash || !/^0x[\da-f]{64}$/i.test(hash))
    throw new Error(
      "Provide a transaction hash: npm run ethereum:inspect -- 0x...",
    );
  const call = recordedCall(recording, ethereumUrl(), "ethereum");
  if (Number(await call("eth_chainId")) !== 1337)
    throw new Error("Expected workshop devnet chain 1337. Nothing inspected.");
  const errors: unknown[] = [];
  // Keep the receipt even when sidecar history has expired or the sidecar is down.
  try {
    const status = receiptStatus(
      await call("eth_getTransactionReceipt", [hash]),
    );
    if (status) recording.transaction = transactionRecord(hash, status);
  } catch (error) {
    errors.push(error);
  }
  try {
    recording.admission = parseAdmission(
      await call("skandha_explorer_getTransaction", [hash]),
      hash,
    );
    const outcome = recording.admission.outcome;
    const previous =
      recording.transaction?.hash.toLowerCase() === hash.toLowerCase()
        ? recording.transaction
        : undefined;
    if (
      !previous ||
      ["unknown", "submitted", "rejected"].includes(previous.status)
    ) {
      recording.transaction = transactionRecord(
        hash,
        outcome === "rejected"
          ? "rejected"
          : outcome === "accepted"
            ? "submitted"
            : (previous?.status ?? "unknown"),
      );
    }
    console.log(
      `Admission: ${outcome}, ${recording.admission.checks.length} rule checks, ${recording.admission.events.length} lifecycle events.`,
    );
  } catch (error) {
    errors.push(error);
  }
  if (recording.transaction?.hash.toLowerCase() === hash.toLowerCase())
    console.log(`Transaction ${recording.transaction.status}: ${hash}`);
  if (errors.length)
    throw new Error(
      "Some inspection calls failed; successful evidence was retained. " +
        errors
          .map((e) => (e instanceof Error ? e.message : "RPC failure"))
          .join("; "),
    );
});
