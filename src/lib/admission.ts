import type { Recording } from "./types";

/** Keep rule verdicts and lifecycle metadata, not transaction calldata or provider error prose. */
export function parseAdmission(
  value: unknown,
  hash: string,
): NonNullable<Recording["admission"]> {
  if (value === null) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid explorer detail");
  const detail = value as Record<string, unknown>;
  const admission = detail.admission as {
    outcome?: unknown;
    checks?: unknown;
  } | null;
  const checks = Array.isArray(admission?.checks)
    ? admission.checks.slice(0, 200).flatMap((check: unknown) => {
        if (!check || typeof check !== "object") return [];
        const c = check as Record<string, unknown>;
        return typeof c.rule === "string" && typeof c.verdict === "string"
          ? [{ rule: c.rule.slice(0, 100), verdict: c.verdict.slice(0, 30) }]
          : [];
      })
    : [];
  const events = Array.isArray(detail.events)
    ? detail.events.slice(-200).flatMap((item: unknown) => {
        if (!item || typeof item !== "object") return [];
        const e = item as Record<string, unknown>;
        return typeof e.kind === "string" &&
          typeof e.at === "number" &&
          Number.isFinite(e.at) &&
          e.at >= 0
          ? [
              {
                kind: e.kind.slice(0, 50),
                status:
                  typeof e.status === "string" ? e.status.slice(0, 30) : null,
                at: e.at,
              },
            ]
          : [];
      })
    : [];
  return {
    hash,
    recordedAt: new Date().toISOString(),
    outcome:
      typeof admission?.outcome === "string"
        ? admission.outcome.slice(0, 30)
        : "unavailable",
    checks,
    events,
  };
}
