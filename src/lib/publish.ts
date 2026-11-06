import { makeReport, signingKey } from "./report";
import type { Recording } from "./types";

/** Outbound HTTPS only; no inbound tunnel, node RPC or private key is exposed. */
export async function publishRecording(recording: Recording) {
  const target = process.env.AMPERE_PUBLISH_URL;
  if (!target || !recording.observations.length) return;
  const token = process.env.AMPERE_INGEST_TOKEN;
  if (!token || token.length < 32)
    throw new Error(
      "A collector upload token of at least 32 characters is required.",
    );
  const url = new URL(target);
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "[::1]"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/api/ingest"
  )
    throw new Error(
      "Publish URL must be an HTTPS /api/ingest endpoint (loopback HTTP allowed for testing).",
    );
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(makeReport(recording, await signingKey())),
  });
  await response.body?.cancel();
  if (!response.ok)
    throw new Error(`Snapshot upload failed with HTTP ${response.status}.`);
}
