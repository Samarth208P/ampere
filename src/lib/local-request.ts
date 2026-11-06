/** Next may normalize request.url to localhost; validate the browser's Host/Origin pair instead. */
export function isLocalMutation(request: Request): boolean {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    if (
      process.env.AMPERE_STORAGE === "netlify" ||
      process.env.AMPERE_HOSTED_BUILD === "true"
    ) {
      const allowed = new URL(process.env.AMPERE_SITE_ORIGIN || "");
      return (
        origin.protocol === "https:" &&
        allowed.protocol === "https:" &&
        origin.origin === allowed.origin
      );
    }
    return (
      origin.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) &&
      origin.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
