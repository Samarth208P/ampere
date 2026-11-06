import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const server = path.join(root, ".next", "server");
const manifests = (await readdir(server, { recursive: true })).filter((name) =>
  name.endsWith(".nft.json"),
);
let checked = 0;
for (const name of manifests) {
  const filename = path.join(server, name);
  const manifest = JSON.parse(await readFile(filename, "utf8")) as {
    files: string[];
  };
  for (const file of manifest.files) {
    const relative = path
      .relative(root, path.resolve(path.dirname(filename), file))
      .split(path.sep)
      .join("/");
    if (
      /^(?:\.ampere|\.reference|private)\//.test(relative) ||
      /^\.env(?:\.|$)/.test(relative)
    ) {
      throw new Error(
        "Deployment blocked: a Next.js file trace includes private local data. Check outputFileTracingExcludes. File contents were not logged.",
      );
    }
    checked++;
  }
}
if (!manifests.length)
  throw new Error(
    "No Next.js server file traces found; bundle privacy check could not run.",
  );
console.log(
  `Bundle privacy check passed: ${manifests.length} manifests, ${checked} traced paths; no local keys, recordings, private queries or env files.`,
);
