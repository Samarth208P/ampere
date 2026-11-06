import { verifyReport } from "@/lib/report";
import { isLocalMutation } from "@/lib/local-request";
export async function POST(request: Request) {
  if (!isLocalMutation(request)) return Response.json({ error: "Same-origin local requests required." }, { status: 403 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ valid: false }, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) return Response.json({ error: "Report exceeds 2 MB." }, { status: 413 });
      chunks.push(value);
    }
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const valid = verifyReport(report);
    return Response.json({ valid, sha256: valid ? report.sha256 : null });
  } catch { return Response.json({ valid: false }, { status: 400 }); }
  finally { await reader.cancel().catch(() => {}); }
}
