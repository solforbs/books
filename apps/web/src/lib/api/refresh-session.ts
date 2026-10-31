import { ApiError, REFRESH_IN_PROGRESS } from "./api-error";
import { send } from "./transport";

export const REFRESH_PATH = "/auth/refresh";
const SESSION_PATH = "/auth/me";
/** Web Lock shared by every tab and the installed PWA of this origin. */
export const REFRESH_LOCK = "books-refresh";
/** How long to wait before re-checking when another tab is mid-refresh. */
const BUSY_RETRY_MS = 300;

/**
 * - `refreshed`: the session is valid again; retry the original request.
 * - `failed`: the session is really gone; surface the original error.
 * - `busy`: another tab is still refreshing; surface `refresh_in_progress` (never a logout).
 */
export type RefreshOutcome = "refreshed" | "failed" | "busy";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** True when /auth/me answers OK, i.e. the cookies we hold right now are valid. */
async function sessionIsValid(): Promise<boolean> {
  try {
    await send(SESSION_PATH, "GET");
    return true;
  } catch {
    return false;
  }
}

/** Runs while holding the cross-tab lock, so only one tab at a time spends the refresh cookie. */
async function refreshUnderLock(): Promise<RefreshOutcome> {
  // Another tab may have refreshed while we waited for the lock; its new cookies are ours too.
  if (await sessionIsValid()) return "refreshed";
  try {
    await send(REFRESH_PATH, "POST");
    return "refreshed";
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== REFRESH_IN_PROGRESS) return "failed";
    // The server saw a parallel refresh (e.g. a tab without Web Locks). Give it a moment.
    await wait(BUSY_RETRY_MS);
    return (await sessionIsValid()) ? "refreshed" : "busy";
  }
}

async function withRefreshLock(task: () => Promise<RefreshOutcome>): Promise<RefreshOutcome> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  // Browsers without Web Locks fall back to the in-tab de-dupe in refreshSession below.
  if (typeof locks?.request !== "function") return task();
  // The lock is held until `task` settles; `await` unwraps the DOM typing's nested promise.
  return await locks.request(REFRESH_LOCK, task);
}

// Several requests in this tab may expire at once; they share one locked refresh.
let refreshing: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  refreshing ??= withRefreshLock(refreshUnderLock).finally(() => {
    refreshing = null;
  });
  return refreshing;
}
