import type { KVStore } from "../store";

type MemoryEntry = {
  value: unknown;
  expiresAtMs: number | null;
};

export class MemoryKVStore implements KVStore {
  private store = new Map<string, MemoryEntry>();

  private getEntry(key: string): MemoryEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAtMs !== null && Date.now() > entry.expiresAtMs) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.getEntry(key);
    if (!entry) return null;
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const expiresAtMs =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAtMs });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async increment(key: string, delta = 1, ttlSeconds?: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next =
      typeof current === "number" && Number.isFinite(current) ? current + delta : delta;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

