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
import {
  buildFrameTransfer,
  receiptStatus,
} from "../src/lib/frame-transaction";

const exec = promisify(execFile);
// Public development key, only used against the in-process mock server.
const key =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
test("frame receipt checks reject malformed statuses and individual frame reverts", () => {
  assert.equal(receiptStatus(null), null);
  assert.equal(
    receiptStatus({ status: "0x1", frameReceipts: [{ status: "0x1" }] }),
    "included",
  );
  assert.equal(
    receiptStatus({ status: "0x1", frameReceipts: [{ status: "0x0" }] }),
    "reverted",
  );
  assert.equal(receiptStatus({ status: "0x0" }), "reverted");
  for (const value of [
    false,
    {},
    { status: "success" },
    { status: "0x1", frameReceipts: [null] },
  ])
    assert.throws(() => receiptStatus(value));
});

test("sender and inspector run end to end against an isolated workshop RPC mock", async () => {
  const root = process.cwd();
  const dir = await mkdtemp(path.join(os.tmpdir(), "ampere-ethereum-"));
  const built = await buildFrameTransfer(key, 0n);
  let scenario = "success";
  const calls: string[] = [];
  const server = createServer(async (req, res) => {
    let data = "";
    for await (const chunk of req) data += chunk;
    const body = JSON.parse(data);
    calls.push(body.method);
    let result: unknown;
    let error: unknown;
    switch (body.method) {
      case "eth_chainId":
        result = scenario === "wrong-chain" ? "0x1" : "0x539";
        break;
      case "eth_getBalance":
        result = scenario === "unfunded" ? "0x0" : "0xde0b6b3a7640000";
        break;
      case "eth_getTransactionCount":
        result = "0x0";
        break;
      case "eth_sendFrameTransaction":
        assert.deepEqual(body.params[0], built.wire);
        if (scenario === "reject")
          error = { code: -32500, message: "private-calldata" };
        else if (scenario === "disconnect") {
          req.socket.destroy();
          return;
        } else result = built.hash;
        break;
      case "eth_getTransactionReceipt":
        result = {
          status: "0x1",
          frameReceipts: [{ status: "0x1" }, { status: "0x1" }],
        };
        break;
      case "skandha_explorer_getTransaction":
        result =
          scenario === "expired"
            ? null
            : {
                admission: {
                  outcome: "accepted",
                  checks: [
                    {
                      rule: "OP-011",
                      verdict: "pass",
                      detail: "private-calldata",
                    },
                  ],
                },
                events: [],
              };
        break;
      default:
        error = { code: -32601, message: "Unexpected method" };
    }
    res.setHeader("content-type", "application/json");
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
  const run = (script: string) =>
    exec(
      process.execPath,
      [
        path.join(root, "node_modules/tsx/dist/cli.mjs"),
        path.join(root, "scripts", script),
      ],
      {
        cwd: dir,
        env: { ...process.env, ETHEREUM_RPC_URL: url },
        timeout: 15000,
        windowsHide: true,
      },
    );
  const recording = async () =>
    JSON.parse(
      await readFile(path.join(dir, ".ampere/recording.json"), "utf8"),
    );
  const reset = async () => {
    calls.length = 0;
    await rm(path.join(dir, ".ampere/recording.json"), { force: true });
  };
  try {
    await mkdir(path.join(dir, ".ampere"));
    await writeFile(path.join(dir, ".ampere/devnet-key"), key);
    await run("send-frame.ts");
    assert.equal((await recording()).transaction.status, "included");
    await run("inspect-frame.ts");
    assert.equal((await recording()).admission.checks[0].rule, "OP-011");
    assert.equal(
      JSON.stringify(await recording()).includes("private-calldata"),
      false,
    );
    for (const failure of ["wrong-chain", "unfunded", "reject", "disconnect"]) {
      scenario = failure;
      await reset();
      await assert.rejects(run("send-frame.ts"));
      await assert.rejects(access(path.join(dir, ".ampere/writer.lock")));
      if (failure === "wrong-chain" || failure === "unfunded") {
        assert.equal(calls.includes("eth_sendFrameTransaction"), false);
        assert.equal(calls.includes("skandha_explorer_faucet"), false);
      } else {
        assert.equal((await recording()).transaction.hash, built.hash);
        assert.equal(
          (await recording()).transaction.status,
          failure === "reject" ? "rejected" : "unknown",
        );
      }
    }
    // A network error must not allow an automatic duplicate submission.
    calls.length = 0;
    await assert.rejects(run("send-frame.ts"));
    assert.equal(calls.length, 0);
    scenario = "expired";
    await run("inspect-frame.ts");
    assert.equal((await recording()).transaction.status, "included");
    assert.equal((await recording()).admission.outcome, "unavailable");
  } finally {
    server.closeAllConnections();
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
