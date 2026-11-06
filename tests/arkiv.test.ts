import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  access,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectNode } from "../src/lib/collector";

const exec = promisify(execFile);
test("owned-node benchmark stops on RPC errors and malformed results without disclosing query text", async () => {
  const root = process.cwd();
  const dir = await mkdtemp(path.join(os.tmpdir(), "ampere-arkiv-"));
  let scenario = "reject";
  let queries = 0;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    let result: unknown = "0x539";
    let error: unknown;
    if (body.method === "arkiv_query") {
      queries++;
      if (scenario === "reject")
        error = { code: -32006, message: "private-workload-marker" };
      else result = null;
    } else if (body.method === "web3_clientVersion") result = "test-owned-node";
    else if (body.method === "net_peerCount") result = "malformed";
    else if (body.method === "eth_syncing") result = false;
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        ...(error ? { error } : { result }),
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await mkdir(path.join(dir, ".ampere"));
    await writeFile(
      path.join(dir, ".ampere/benchmark-cases.json"),
      JSON.stringify([{ query: "private-workload-marker", limit: 1 }]),
    );
    for (const name of ["reject", "malformed"]) {
      scenario = name;
      queries = 0;
      const { stdout, stderr } = await exec(
        process.execPath,
        [
          path.join(root, "node_modules/tsx/dist/cli.mjs"),
          path.join(root, "scripts/benchmark-arkiv.ts"),
        ],
        {
          cwd: dir,
          env: {
            ...process.env,
            ARKIV_RPC_URL: url,
            ARKIV_CONTAINER: "ampere-test-nonexistent-container",
          },
          timeout: 15000,
          windowsHide: true,
        },
      );
      const data = await readFile(
        path.join(dir, ".ampere/recording.json"),
        "utf8",
      );
      const saved = JSON.parse(data);
      assert.equal(queries, 1);
      assert.equal(saved.benchmark.stoppedEarly, true);
      assert.equal(saved.benchmark.samples, 1);
      assert.equal(
        saved.observations.at(-1).outcome,
        name === "reject" ? "rpc-error" : "transport-error",
      );
      assert.equal(
        (data + stdout + stderr).includes("private-workload-marker"),
        false,
      );
      await assert.rejects(access(path.join(dir, ".ampere/writer.lock")));
    }
    const { node } = await collectNode("arkiv", url);
    assert.equal(node.connected, true);
    assert.equal(node.peers, null);
    assert.equal(node.syncing, false);
  } finally {
    server.closeAllConnections();
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
