import { readFile } from "node:fs/promises";
import { verifyReport } from "../src/lib/report";
const file = process.argv[2];
if (!file) throw new Error("Usage: npm run verify -- path/to/report.json");
const valid = verifyReport(JSON.parse(await readFile(file, "utf8")));
console.log(
  valid
    ? "VALID: digest and signature match. Signer identity and measurement truth are not established."
    : "INVALID: report integrity check failed.",
);
process.exitCode = valid ? 0 : 1;
