/** Next may normalize request.url to localhost; validate the browser's Host/Origin pair instead. */
export function isLocalMutation(request: Request): boolean {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    return (
      origin.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) &&
      origin.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
