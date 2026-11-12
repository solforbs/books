import { createHash } from "node:crypto";

/** JSON with object keys sorted at every level, so the same request always gives the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Fingerprint of a command (everything except its `commandId`): the same command sent again
 * has the same hash, a different request that reuses the id does not (G6).
 */
export function hashCommand(operation: string, deliveryId: string | null, body: object): string {
  const rest: Record<string, unknown> = { ...body };
  delete rest.commandId;
  return createHash("sha256")
    .update(stableStringify({ operation, deliveryId, body: rest }))
    .digest("hex");
}
