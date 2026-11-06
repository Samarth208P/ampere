import { cloudEnabled, ingestReport } from "@/lib/cloud";
export async function POST(request: Request) {
  if (!cloudEnabled())
    return Response.json(
      { error: "Cloud ingestion is disabled." },
      { status: 404 },
    );
  return ingestReport(request);
}
