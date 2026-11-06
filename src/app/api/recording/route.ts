import { readRecording } from "@/lib/store";
import { fixtureRecording } from "@/lib/fixture";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const fixture = new URL(request.url).searchParams.get("mode") === "fixture";
    return Response.json(fixture ? fixtureRecording() : await readRecording(), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "The recording could not be read. Check .ampere/recording.json and restart the collector." }, { status: 500 }); }
}
