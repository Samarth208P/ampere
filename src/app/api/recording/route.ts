import { readRecording } from "@/lib/store";
import { fixtureRecording } from "@/lib/fixture";
import { cloudEnabled, cloudReadable, readCloudReport } from "@/lib/cloud";
import { emptyRecording } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const fixture = new URL(request.url).searchParams.get("mode") === "fixture";
    if (!fixture && cloudEnabled() && !cloudReadable())
      return Response.json(
        {
          error:
            "Hosted live data is disabled. Set AMPERE_PUBLIC_DASHBOARD=true to share sanitized snapshots, or use Example mode.",
        },
        { status: 503 },
      );
    const recording = fixture
      ? fixtureRecording()
      : cloudEnabled()
        ? ((await readCloudReport())?.payload.recording ?? emptyRecording())
        : await readRecording();
    return Response.json(recording, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error: cloudEnabled()
          ? "Hosted recording unavailable. Check Netlify Blobs configuration and the collector signer fingerprint."
          : "The recording could not be read. Check .ampere/recording.json and restart the collector.",
      },
      { status: 500 },
    );
  }
}
