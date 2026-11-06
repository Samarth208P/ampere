import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { readRecording, saveRecording } from "./store";
import type { Recording } from "./types";

/** Exclusive CLI writer. Never discard a crashed process's lock automatically. */
export async function withWriter<T>(
  run: () => Promise<T>,
  directory = ".ampere",
): Promise<T> {
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, "writer.lock");
  const lock = await open(filename, "wx").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
      throw new Error(
        "Another writer holds .ampere/writer.lock. Stop it first. After a crash, verify no writer is running before removing the lock.",
      );
    },
  );
  try {
    await lock.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    return await run();
  } finally {
    try {
      await lock.close();
    } finally {
      await unlink(filename);
    }
  }
}

/** Retain failed RPC observations too; release the lock even if loading/saving fails. */
export async function withRecordingWriter(
  run: (recording: Recording) => Promise<void>,
) {
  return withWriter(async () => {
    const recording = await readRecording();
    try {
      await run(recording);
    } finally {
      await saveRecording(recording);
    }
  });
}
