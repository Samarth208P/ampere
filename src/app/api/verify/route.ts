import { verifyReport } from "@/lib/report";
import { isLocalMutation } from "@/lib/local-request";
import { BodyLimitError, readBoundedJson } from "@/lib/bounded-json";
export async function POST(request: Request) {
  if (!isLocalMutation(request))
    return Response.json(
      { error: "A request from the configured dashboard origin is required." },
      { status: 403 },
    );
  try {
    const report = await readBoundedJson(request);
    const valid = verifyReport(report);
    return Response.json({
      valid,
      sha256: valid ? (report as { sha256: string }).sha256 : null,
    });
  } catch (error) {
    if (error instanceof BodyLimitError)
      return Response.json({ error: error.message }, { status: 413 });
    return Response.json({ valid: false }, { status: 400 });
  }
}
