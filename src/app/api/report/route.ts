import { makeReport, signingKey } from "@/lib/report";
import { readRecording } from "@/lib/store";
import { fixtureRecording } from "@/lib/fixture";
import { isLocalMutation } from "@/lib/local-request";
import { cloudEnabled, cloudReadable, readCloudReport } from "@/lib/cloud";
import { generateKeyPairSync } from "node:crypto";
export async function POST(request: Request) {
  if (!isLocalMutation(request))
    return Response.json(
      { error: "A request from the configured dashboard origin is required." },
      { status: 403 },
    );
  try {
    const fixture = new URL(request.url).searchParams.get("mode") === "fixture";
    if (cloudEnabled() && !fixture) {
      if (!cloudReadable())
        return Response.json(
          { error: "Hosted live data is disabled." },
          { status: 503 },
        );
      const report = await readCloudReport();
      if (!report)
        return Response.json(
          { error: "No collector snapshot uploaded yet." },
          { status: 409 },
        );
      return Response.json(report, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="ampere-live-${report.sha256.slice(0, 12)}.json"`,
        },
      });
    }
    const recording = fixture ? fixtureRecording() : await readRecording();
    if (!recording.observations.length)
      return Response.json(
        { error: "Collect some requests before exporting a report." },
        { status: 409 },
      );
    const key = cloudEnabled()
      ? generateKeyPairSync("ed25519")
          .privateKey.export({ type: "pkcs8", format: "pem" })
          .toString()
      : await signingKey();
    const report = makeReport(recording, key);
    return Response.json(report, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="ampere-${recording.mode}-${report.sha256.slice(0, 12)}.json"`,
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Could not export the recording. Check .ampere/recording.json and write access to .ampere, then try again.",
      },
      { status: 500 },
    );
  }
}
