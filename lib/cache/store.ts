export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  increment(key: string, delta?: number, ttlSeconds?: number): Promise<number>;
  getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}

