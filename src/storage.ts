// localStorage wrapper. Every access is guarded: private mode or full storage must never break the app.
export const storage = {
  getJSON<T>(key: string): T | null {
    try {
      const s = globalThis.localStorage?.getItem(key);
      return s ? (JSON.parse(s) as T) : null;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): void {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
