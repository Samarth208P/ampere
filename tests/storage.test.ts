import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { withWriter, withRecordingWriter } from "../src/lib/writer";
import { emptyRecording, readRecording, saveRecording } from "../src/lib/store";
import { isRecording } from "../src/lib/recording-schema";
import { fixtureRecording } from "../src/lib/fixture";
import { signingKey, makeReport, verifyReport } from "../src/lib/report";

test("schema rejects corrupt values and unapproved fields before sharing", () => {
  const good = fixtureRecording();
  assert.equal(isRecording(good), true);
  for (const broken of [
    null,
    {},
    { ...good, observations: null },
    { ...good, mode: "live" },
    { ...good, params: "secret query" },
    { ...good, observations: [good.observations[0], good.observations[0]] },
    { ...good, resources: { ...good.resources, cpuPercent: NaN } },
    { ...good, observations: [{ ...good.observations[0], durationMs: -1 }] },
  ])
    assert.equal(isRecording(broken), false);
});

test("writer excludes concurrent operations and releases lock after callback failure", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ampere-lock-"));
  try {
    await assert.rejects(
      withWriter(async () => {
        const owner = JSON.parse(
          await readFile(path.join(dir, "writer.lock"), "utf8"),
        );
        assert.equal(owner.pid, process.pid);
        await assert.rejects(
          withWriter(async () => {}, dir),
          /Another writer/,
        );
        throw new Error("write failed");
      }, dir),
      /write failed/,
    );
    await withWriter(async () => {}, dir);
    await assert.rejects(access(path.join(dir, "writer.lock")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("storage preserves corrupt input, cleans failed writers, and saves bounded chronological snapshots", async () => {
  // This test file runs in its own Node process, isolated from the checkout data.
  const original = process.cwd();
  const dir = await mkdtemp(path.join(os.tmpdir(), "ampere-store-"));
  process.chdir(dir);
  try {
    const keys = await Promise.all(
      Array.from({ length: 12 }, () => signingKey()),
    );
    assert.equal(new Set(keys).size, 1);
    assert.equal(verifyReport(makeReport(fixtureRecording(), keys[0])), true);
    assert.deepEqual(await readRecording(), emptyRecording());
    await withRecordingWriter(async (r) => {
      r.nodes = [];
    });
    await writeFile(".ampere/recording.json", "broken");
    await assert.rejects(withRecordingWriter(async () => {}));
    assert.equal(await readFile(".ampere/recording.json", "utf8"), "broken");
    await assert.rejects(access(".ampere/writer.lock"));
    await writeFile(".ampere/recording.json", JSON.stringify(emptyRecording()));
    await assert.rejects(
      withRecordingWriter(async (r) => {
        r.observations.push({
          ...fixtureRecording().observations[0],
          source: "live",
          id: "retained",
        });
        throw new Error("network failed");
      }),
      /network failed/,
    );
    assert.equal((await readRecording()).observations[0].id, "retained");
    const sample = fixtureRecording();
    sample.observations = Array.from({ length: 1010 }, (_, i) => ({
      ...sample.observations[0],
      id: String(i),
      recordedAt: new Date(i * 1000).toISOString(),
    })).reverse();
    await saveRecording(sample);
    const saved = await readRecording();
    assert.equal(saved.observations.length, 1000);
    assert.equal(saved.observations[0].id, "10");
    assert.equal(saved.observations.at(-1)?.id, "1009");
    await assert.rejects(
      withRecordingWriter(async (r) => {
        (r as unknown as { bad: boolean }).bad = true;
      }),
    );
    await assert.rejects(access(".ampere/writer.lock"));
  } finally {
    process.chdir(original);
    await rm(dir, { recursive: true, force: true });
  }
});
