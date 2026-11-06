export class BodyLimitError extends Error {}

export async function readBoundedJson(
  request: Request,
  limit = 2_000_000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new BodyLimitError("Report exceeds 2 MB.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {});
  }
}
