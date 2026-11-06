import { signingKey } from "../src/lib/report";
import { signerFingerprint } from "../src/lib/cloud";
import { createPublicKey } from "node:crypto";
const key = await signingKey();
console.log(
  "AMPERE_SIGNER_SHA256=" +
    signerFingerprint(
      createPublicKey(key).export({ type: "spki", format: "pem" }).toString(),
    ),
);
console.log(
  "Public fingerprint only. Keep .ampere/report-key.pem on the collector machine.",
);
