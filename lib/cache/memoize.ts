type CacheEntry<T> = {
  value: Promise<T>;
  expiresAtMs: number;
};

export function createAsyncTtlMemo<T>(ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>();

  const get = (key: string, fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const existing = cache.get(key);
    if (existing && existing.expiresAtMs > now) return existing.value;

    const value = fn();
    cache.set(key, { value, expiresAtMs: now + ttlMs });
    return value;
  };

  const del = (key: string) => {
    cache.delete(key);
  };

  const clear = () => {
    cache.clear();
  };

  return { get, delete: del, clear };
}

