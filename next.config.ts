import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  outputFileTracingExcludes: {
    "/*": ["./.ampere/**/*", "./.reference/**/*", "./private/**/*", "./.env*"],
  },
  // Non-secret build identifiers; CONTEXT/DEPLOY_ID aren't function runtime vars.
  env: {
    AMPERE_HOSTED_BUILD: process.env.NETLIFY === "true" ? "true" : "false",
    AMPERE_DEPLOY_SCOPE:
      process.env.CONTEXT === "production"
        ? "production"
        : process.env.DEPLOY_ID || "local",
  },
};
export default config;
