const STORAGE_KEY = 'pearl-playground:anthropic-api-key';

/**
 * Wrapped in try/catch — private browsing or a locked-down browser can throw
 * on any localStorage access, and a failed read/write here should degrade to
 * "no stored key," never crash the app.
 */
export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage unavailable — the key still works for this session via React
    // state, it just won't survive a reload. Nothing to recover here.
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above.
  }
}
