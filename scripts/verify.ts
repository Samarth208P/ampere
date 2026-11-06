import { readFile, stat } from "node:fs/promises";
import { verifyReport } from "../src/lib/report";
const file = process.argv[2];
if (!file) throw new Error("Usage: npm run verify -- path/to/report.json");
let valid = false;
try {
  if ((await stat(file)).size > 2_000_000)
    throw new Error("Report exceeds 2 MB.");
  valid = verifyReport(JSON.parse(await readFile(file, "utf8")));
} catch {
  // A malformed report must not print its contents through a JSON parser error.
  console.error(
    "Cannot read a valid report of at most 2 MB from the supplied path.",
  );
}
console.log(
  valid
    ? "VALID: digest and signature match. Signer identity and measurement truth are not established."
    : "INVALID: report integrity check failed.",
);
process.exitCode = valid ? 0 : 1;
