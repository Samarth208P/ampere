import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { measuredRpc, RpcFailure, assertLocalEndpoint } from "../src/lib/rpc";
import { percentile, summarize, diskForecast } from "../src/lib/analysis";
import { fixtureRecording } from "../src/lib/fixture";
import { canonical, makeReport, verifyReport } from "../src/lib/report";

test("signed reports reject edited measurements, digest, signature and signer", () => {
  const key = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const report = makeReport(fixtureRecording(), key);
  assert.equal(verifyReport(report), true);
  const changed = structuredClone(report); changed.payload.recording.observations[0].durationMs++;
  assert.equal(verifyReport(changed), false);
  assert.equal(verifyReport({ ...report, sha256: "0".repeat(64) }), false);
  assert.equal(verifyReport({ ...report, signature: "bad" }), false);
  assert.equal(verifyReport({ ...report, publicKey: "bad" }), false);
  assert.equal(canonical({ b: 1, a: [true, null] }), canonical({ a: [true, null], b: 1 }));
  assert.throws(() => canonical({ latency: NaN }));
});

test("latency comparison needs disjoint baseline and recent windows; excludes errors", () => {
  const seed = fixtureRecording().observations[0];
  const rows = Array.from({ length: 10 }, (_, i) => ({ ...seed, id: String(i), durationMs: i < 5 ? 10 : 40 }));
  assert.equal(summarize(rows)[0].ratio, 4);
  assert.equal(summarize(rows.slice(0, 9))[0].ratio, null);
  assert.equal(summarize([...rows, { ...seed, outcome: "timeout", durationMs: 8000 }])[0].p95, 40);
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.95), 5);
});

test("disk forecast refuses short or shrinking usage windows", () => {
  assert.equal(diskForecast({ at: 0, free: 100 }, { at: 1000, free: 90 }), null);
  assert.equal(diskForecast({ at: 0, free: 100 }, { at: 86400000, free: 110 }), null);
  assert.equal(diskForecast({ at: 0, free: 100 }, { at: 86400000, free: 90 }), 9);
});

test("Arkiv targets are loopback-only with no DNS or credentials", () => {
  assert.equal(assertLocalEndpoint("http://127.0.0.1:8545"), "http://127.0.0.1:8545/");
  for (const value of ["https://rpc.arkiv.network", "http://localhost:8545", "http://127.0.0.1.attacker.test", "http://user:pass@127.0.0.1", "file:///tmp/a"]) assert.throws(() => assertLocalEndpoint(value));
});

test("RPC measures real HTTP and keeps rejected calls, malformed responses, timeouts and secrets separate", async () => {
  const server = createServer(async (req, res) => {
    let data = ""; for await (const chunk of req) data += chunk;
    const body = JSON.parse(data);
    res.setHeader("content-type", "application/json");
    if (body.method === "slow") return;
    if (body.method === "malformed") return void res.end("not-json");
    if (body.method === "wrong-id") return void res.end(JSON.stringify({ jsonrpc: "2.0", id: "different", result: 1 }));
    if (body.method === "too-large") return void res.end("x".repeat(2_000_001));
    res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, ...(body.method === "reject" ? { error: { code: -32602, message: "private-query" } } : { result: "0x1" }) }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const result = await measuredRpc(url, "arkiv", "ok", ["private-query"]);
    assert.equal(result.value, "0x1"); assert.equal(result.observation.outcome, "ok");
    assert.ok(result.observation.durationMs > 0);
    assert.equal(JSON.stringify(result.observation).includes("private-query"), false);
    for (const [method, outcome] of [["reject", "rpc-error"], ["malformed", "transport-error"], ["wrong-id", "transport-error"], ["too-large", "transport-error"], ["slow", "timeout"]]) {
      await assert.rejects(measuredRpc(url, "arkiv", method, [], method === "slow" ? 40 : 2000), (error: unknown) => {
        assert.ok(error instanceof RpcFailure); assert.equal(error.observation.outcome, outcome);
        assert.equal(JSON.stringify(error).includes("private-query"), false); return true;
      });
    }
  } finally { server.closeAllConnections(); server.close(); }
});
