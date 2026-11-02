/**
 * Small per-device preferences in localStorage. Storage can be missing or blocked (private
 * mode, full disk), so every access is wrapped and simply falls back to "nothing saved".
 */
export function readDeviceValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeDeviceValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembering a preference is fine; the app keeps working.
  }
}
