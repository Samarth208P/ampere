import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Recording } from "./types";

const filename = () => path.join(process.cwd(), ".ampere", "recording.json");
export const emptyRecording = (): Recording => ({ version: 1, mode: "live", observations: [], nodes: [], resources: null });
export async function readRecording(): Promise<Recording> {
  try { return JSON.parse(await readFile(filename(), "utf8")) as Recording; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyRecording(); throw error; }
}
export async function saveRecording(recording: Recording) {
  await mkdir(path.dirname(filename()), { recursive: true });
  const temp = `${filename()}.${randomUUID()}.tmp`;
  // Single CLI writer; atomic replacement lets the dashboard read complete snapshots.
  await writeFile(temp, JSON.stringify({ ...recording, observations: recording.observations.slice(-1000) }, null, 2));
  await rename(temp, filename());
}
