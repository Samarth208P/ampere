import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { getStore, setEnvironmentContext } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import {
  cloudStoreName,
  ingestReport,
  readCloudReport,
  signerFingerprint,
} from "../src/lib/cloud";
import { fixtureRecording } from "../src/lib/fixture";
import { makeReport, signingKey, verifyReport } from "../src/lib/report";
import { publishRecording } from "../src/lib/publish";
import { saveRecording } from "../src/lib/store";
import { isLocalMutation } from "../src/lib/local-request";
import { GET as recordingRoute } from "../src/app/api/recording/route";
import { POST as reportRoute } from "../src/app/api/report/route";

test("hosted mutation origins and preview stores are explicit and isolated", () => {
  process.env.AMPERE_STORAGE = "netlify";
  process.env.AMPERE_SITE_ORIGIN = "https://ampere.example";
  const request = (origin: string) =>
    new Request("https://ampere.example/api/report", { headers: { origin } });
  assert.equal(isLocalMutation(request("https://ampere.example")), true);
  assert.equal(isLocalMutation(request("https://evil.example")), false);
  assert.equal(isLocalMutation(request("http://ampere.example")), false);
  process.env.AMPERE_DEPLOY_SCOPE = "production";
  assert.equal(cloudStoreName(), "ampere-production");
  process.env.AMPERE_DEPLOY_SCOPE = "preview-123";
  assert.equal(cloudStoreName(), "ampere-preview-123");
  for (const key of [
    "AMPERE_STORAGE",
    "AMPERE_SITE_ORIGIN",
    "AMPERE_DEPLOY_SCOPE",
  ])
    delete process.env[key];
});

test("signed snapshot relay uses real local Blobs SDK storage and rejects unauthorized or altered uploads", async () => {
  const original = process.cwd();
  const dir = await mkdtemp(path.join(os.tmpdir(), "ampere-cloud-"));
  process.chdir(dir);
  const blobs = new BlobsServer({
    directory: path.join(dir, "blobs"),
    token: "local-test-token",
    logger: () => {},
  });
  const address = await blobs.start();
  const store = getStore({
    name: cloudStoreName(),
    siteID: "local-test-site",
    token: "local-test-token",
    apiURL: `http://127.0.0.1:${address.port}`,
    consistency: "strong",
  });
  const token = "test-only-collector-token-with-at-least-32-characters";
  process.env.AMPERE_INGEST_TOKEN = token;
  const key = await signingKey();
  const data = fixtureRecording();
  data.mode = "live";
  data.observations.forEach((o) => {
    o.source = "live";
  });
  const report = makeReport(data, key);
  process.env.AMPERE_SIGNER_SHA256 = signerFingerprint(report.publicKey);
  const request = (body: unknown, auth = token) =>
    new Request("https://ampere.example/api/ingest", {
      method: "POST",
      headers: { authorization: `Bearer ${auth}` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  let unavailable = false;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (unavailable) {
      res.writeHead(503);
      res.end();
      return;
    }
    const response = await ingestReport(
      request(body, (req.headers.authorization || "").slice(7)),
      () => store,
    );
    res.writeHead(response.status, { "content-type": "application/json" });
    res.end(await response.text());
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    assert.equal(await readCloudReport(store), null);
    assert.equal(
      (await ingestReport(request(report, "wrong"), () => store)).status,
      401,
    );
    assert.equal(
      (await ingestReport(request("not json"), () => store)).status,
      400,
    );
    assert.equal(
      (await ingestReport(request("x".repeat(2000001)), () => store)).status,
      413,
    );
    assert.equal(
      (
        await ingestReport(
          request(makeReport(fixtureRecording(), key)),
          () => store,
        )
      ).status,
      400,
    );
    const changed = structuredClone(report);
    changed.payload.recording.observations[0].durationMs++;
    assert.equal(
      (await ingestReport(request(changed), () => store)).status,
      400,
    );
    process.env.AMPERE_SIGNER_SHA256 = "0".repeat(64);
    assert.equal(
      (await ingestReport(request(report), () => store)).status,
      400,
    );
    process.env.AMPERE_SIGNER_SHA256 = signerFingerprint(report.publicKey);
    assert.equal(
      (await ingestReport(request(report), () => store)).status,
      200,
    );
    assert.equal(
      (await ingestReport(request(report), () => store)).status,
      409,
    );
    assert.deepEqual(await readCloudReport(store), report);
    setEnvironmentContext({
      siteID: "local-test-site",
      token: "local-test-token",
      apiURL: `http://127.0.0.1:${address.port}`,
    });
    process.env.AMPERE_STORAGE = "netlify";
    process.env.AMPERE_SITE_ORIGIN = "https://ampere.example";
    assert.equal(
      (
        await recordingRoute(
          new Request("https://ampere.example/api/recording"),
        )
      ).status,
      503,
    );
    process.env.AMPERE_PUBLIC_DASHBOARD = "true";
    assert.deepEqual(
      await (
        await recordingRoute(
          new Request("https://ampere.example/api/recording"),
        )
      ).json(),
      data,
    );
    const exported = await reportRoute(
      new Request("https://ampere.example/api/report", {
        method: "POST",
        headers: { origin: "https://ampere.example" },
      }),
    );
    assert.equal(exported.status, 200);
    assert.deepEqual(await exported.json(), report);
    process.env.AMPERE_PUBLISH_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/ingest`;
    await publishRecording(data);
    const stored = await readCloudReport(store);
    assert.equal(verifyReport(stored), true);
    assert.equal(JSON.stringify(stored).includes(token), false);
    // Local durability is independent of cloud availability or a bad token.
    unavailable = true;
    await saveRecording(data);
    assert.equal(
      JSON.parse(await readFile(".ampere/recording.json", "utf8")).observations
        .length,
      36,
    );
    process.env.AMPERE_PUBLISH_URL = "http://public.example/api/ingest";
    await assert.rejects(publishRecording(data), /HTTPS/);
  } finally {
    server.closeAllConnections();
    server.close();
    await blobs.stop();
    process.chdir(original);
    for (const key of [
      "AMPERE_INGEST_TOKEN",
      "AMPERE_SIGNER_SHA256",
      "AMPERE_PUBLISH_URL",
      "AMPERE_STORAGE",
      "AMPERE_SITE_ORIGIN",
      "AMPERE_PUBLIC_DASHBOARD",
    ])
      delete process.env[key];
    await rm(dir, { recursive: true, force: true });
  }
});
