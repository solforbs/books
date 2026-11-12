import { useRef } from "react";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * The same request sent again (a retry after a bad connection) keeps its commandId, so the
 * server returns the first result instead of saving twice. A changed request gets a new one:
 * the same id with a different body is refused by the server (`command_conflict`).
 */
export function useCommandId() {
  const last = useRef<{ fingerprint: string; id: string } | null>(null);
  return (body: unknown): string => {
    const fingerprint = JSON.stringify(body);
    if (last.current?.fingerprint === fingerprint) return last.current.id;
    last.current = { fingerprint, id: makeId() };
    return last.current.id;
  };
}
