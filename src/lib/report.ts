import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
  createPublicKey,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Recording } from "./types";
import { assertRecording, isRecording } from "./recording-schema";

export function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  throw new Error("Report contains a non-JSON value");
}

export interface SignedReport {
  payload: {
    schema: "ampere.report.v1";
    createdAt: string;
    recording: Recording;
    limitations: string[];
  };
  sha256: string;
  signature: string;
  publicKey: string;
}

export function makeReport(
  recording: Recording,
  privateKey: string,
): SignedReport {
  assertRecording(recording);
  // JSON normalization removes absent optional fields, before hashing or signing.
  const payload: SignedReport["payload"] = JSON.parse(
    JSON.stringify({
      schema: "ampere.report.v1",
      createdAt: new Date().toISOString(),
      recording,
      limitations: [
        "Client wall-clock latency is not server CPU cost.",
        "An embedded signing key does not establish operator identity.",
        "Integrity does not establish measurement truth.",
        "Fixture recordings are synthetic, never live network evidence.",
      ],
    }),
  );
  const bytes = Buffer.from(canonical(payload));
  return {
    payload,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    signature: sign(null, bytes, privateKey).toString("base64"),
    publicKey: createPublicKey(privateKey)
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
}

export function verifyReport(value: unknown): boolean {
  try {
    const report = value as SignedReport;
    if (
      report.payload.schema !== "ampere.report.v1" ||
      !isRecording(report.payload.recording) ||
      !Number.isFinite(Date.parse(report.payload.createdAt)) ||
      !Array.isArray(report.payload.limitations) ||
      !report.payload.limitations.every((v) => typeof v === "string") ||
      typeof report.signature !== "string" ||
      !/^[A-Za-z0-9+/]{86}==$/.test(report.signature) ||
      createPublicKey(report.publicKey).asymmetricKeyType !== "ed25519"
    )
      return false;
    const bytes = Buffer.from(canonical(report.payload));
    return (
      createHash("sha256").update(bytes).digest("hex") === report.sha256 &&
      verify(
        null,
        bytes,
        report.publicKey,
        Buffer.from(report.signature, "base64"),
      )
    );
  } catch {
    return false;
  }
}

export async function signingKey(): Promise<string> {
  const dir = path.join(process.cwd(), ".ampere");
  const file = path.join(dir, "report-key.pem");
  await mkdir(dir, { recursive: true });
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const { privateKey } = generateKeyPairSync("ed25519");
  try {
    await writeFile(file, privateKey.export({ type: "pkcs8", format: "pem" }), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return readFile(file, "utf8");
}
