import {
  mkdir,
  readFile,
  rename,
  writeFile,
  unlink,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Recording } from "./types";
import { assertRecording } from "./recording-schema";

const filename = () => path.join(process.cwd(), ".ampere", "recording.json");
export const emptyRecording = (): Recording => ({
  version: 1,
  mode: "live",
  observations: [],
  nodes: [],
  resources: null,
});
export async function readRecording(): Promise<Recording> {
  try {
    if ((await stat(filename())).size > 2_000_000)
      throw new Error("Recording exceeds 2 MB.");
    const recording: unknown = JSON.parse(await readFile(filename(), "utf8"));
    assertRecording(recording);
    return recording;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return emptyRecording();
    throw error;
  }
}
export async function saveRecording(recording: Recording) {
  const snapshot = {
    ...recording,
    observations: [...recording.observations]
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
      .slice(-1000),
  };
  assertRecording(snapshot);
  await mkdir(path.dirname(filename()), { recursive: true });
  const temp = `${filename()}.${randomUUID()}.tmp`;
  // Single CLI writer; atomic replacement lets the dashboard read complete snapshots.
  try {
    await writeFile(temp, JSON.stringify(snapshot, null, 2));
    await rename(temp, filename());
  } finally {
    await unlink(temp).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
