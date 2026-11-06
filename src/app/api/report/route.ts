import { makeReport, signingKey } from "@/lib/report";
import { readRecording } from "@/lib/store";
import { fixtureRecording } from "@/lib/fixture";
import { isLocalMutation } from "@/lib/local-request";
export async function POST(request: Request) {
  if (!isLocalMutation(request)) return Response.json({ error: "Same-origin local requests required." }, { status: 403 });
  const fixture = new URL(request.url).searchParams.get("mode") === "fixture";
  const recording = fixture ? fixtureRecording() : await readRecording();
  if (!recording.observations.length) return Response.json({ error: "Collect some requests before exporting a report." }, { status: 409 });
  const report = makeReport(recording, await signingKey());
  return Response.json(report, { headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="ampere-${recording.mode}-${report.sha256.slice(0, 12)}.json"` } });
}
