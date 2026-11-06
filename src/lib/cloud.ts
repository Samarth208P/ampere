import { createHash, createPublicKey, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { verifyReport, type SignedReport } from "./report";
import { BodyLimitError, readBoundedJson } from "./bounded-json";

export const cloudEnabled = () =>
  process.env.AMPERE_STORAGE === "netlify" ||
  process.env.AMPERE_HOSTED_BUILD === "true";
export const cloudReadable = () =>
  process.env.AMPERE_PUBLIC_DASHBOARD === "true";
export const signerFingerprint = (pem: string) =>
  createHash("sha256")
    .update(createPublicKey(pem).export({ format: "der", type: "spki" }))
    .digest("hex");

export function cloudStoreName() {
  // Never let a deploy preview write production measurements.
  const scope = process.env.AMPERE_DEPLOY_SCOPE || "local";
  return `ampere-${scope.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 55)}`;
}
export const cloudStore = () =>
  getStore({ name: cloudStoreName(), consistency: "strong" });
type SnapshotStore = Pick<
  ReturnType<typeof getStore>,
  "getWithMetadata" | "setJSON"
>;

function authorized(request: Request): boolean {
  const token = process.env.AMPERE_INGEST_TOKEN;
  if (!token || token.length < 32) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}

export function trustedReport(value: unknown): value is SignedReport {
  try {
    const fingerprint = process.env.AMPERE_SIGNER_SHA256;
    return (
      !!fingerprint &&
      /^[a-f\d]{64}$/i.test(fingerprint) &&
      verifyReport(value) &&
      signerFingerprint((value as SignedReport).publicKey) ===
        fingerprint.toLowerCase()
    );
  } catch {
    return false;
  }
}

export async function readCloudReport(
  store: SnapshotStore = cloudStore(),
): Promise<SignedReport | null> {
  const stored = await store.getWithMetadata("latest", { type: "json" });
  if (!stored) return null;
  if (!trustedReport(stored.data))
    throw new Error("Stored report failed integrity or signer validation.");
  return stored.data;
}

export async function ingestReport(
  request: Request,
  getSnapshotStore: () => SnapshotStore = cloudStore,
) {
  if (!authorized(request))
    return Response.json(
      { error: "Collector authentication required." },
      { status: 401 },
    );
  try {
    const report = await readBoundedJson(request);
    if (
      !trustedReport(report) ||
      report.payload.recording.mode !== "live" ||
      !report.payload.recording.observations.length
    )
      return Response.json(
        {
          error: "A valid live report from the configured signer is required.",
        },
        { status: 400 },
      );
    const timestamp = Date.parse(report.payload.createdAt);
    if (timestamp > Date.now() + 300000 || timestamp < Date.now() - 86400000)
      return Response.json(
        { error: "Report timestamp outside the allowed upload window." },
        { status: 400 },
      );
    const store = getSnapshotStore();
    const previous = await store.getWithMetadata("latest", { type: "json" });
    if (
      previous &&
      trustedReport(previous.data) &&
      Date.parse(previous.data.payload.createdAt) >= timestamp
    )
      return Response.json(
        { error: "A newer or identical report is already stored." },
        { status: 409 },
      );
    const result = await store.setJSON(
      "latest",
      report,
      previous?.etag
        ? { onlyIfMatch: previous.etag }
        : previous
          ? {}
          : { onlyIfNew: true },
    );
    if (!result.modified)
      return Response.json(
        {
          error:
            "Snapshot changed during upload; retry on the next collection.",
        },
        { status: 409 },
      );
    return Response.json(
      { accepted: true, sha256: report.sha256 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BodyLimitError)
      return Response.json({ error: error.message }, { status: 413 });
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid report JSON." }, { status: 400 });
    return Response.json(
      {
        error:
          "Snapshot storage unavailable. Check Netlify function configuration.",
      },
      { status: 503 },
    );
  }
}
